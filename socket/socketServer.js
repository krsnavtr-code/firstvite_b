import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../model/User.js";

// Thread-safe data structures with atomic operations
const activeUsers = new Map(); // userId -> { socketId, user, connectionState, lastHeartbeat }
const classroomParticipants = new Map(); // sessionId -> Map(userId -> { socketId, role, joinedAt, connectionState })
const connectionLocks = new Map(); // sessionId -> Set of userIds currently joining (prevents race conditions)
const heartbeatInterval = 30000; // 30 seconds
const connectionTimeout = 60000; // 60 seconds

export const initializeSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: heartbeatInterval,
    pingInterval: heartbeatInterval / 2,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  // Atomic authentication with connection state tracking
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token || socket.handshake.headers.authorization;
      if (!token)
        return next(new Error("Authentication error: No token provided"));

      const tokenString = token.startsWith("Bearer ") ? token.slice(7) : token;
      const decoded = jwt.verify(tokenString, process.env.JWT_SECRET);
      const user = await User.findById(
        decoded.id || decoded._id || decoded.userId,
      );

      if (!user) return next(new Error("Authentication error: User not found"));

      socket.user = user;
      socket.userId = user._id.toString();
      socket.connectionState = "authenticated";

      console.log(`[AUTH] User ${socket.userId} authenticated successfully`);
      next();
    } catch (error) {
      console.error(
        "[AUTH ERROR] Socket authentication failed:",
        error.message,
      );
      socket.connectionState = "failed";
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(
      `[CONNECT] User ${socket.userId} connected with socket ${socket.id}`,
    );

    // Clean up any stale connections for this user (reconnection handling)
    const existingConnection = activeUsers.get(socket.userId);
    if (existingConnection) {
      console.log(
        `[RECONNECT] Cleaning up stale connection for user ${socket.userId}`,
      );
      const oldSocket = io.sockets.sockets.get(existingConnection.socketId);
      if (oldSocket && oldSocket.id !== socket.id) {
        oldSocket.disconnect(true);
      }
    }

    // Atomically update active users with connection state
    activeUsers.set(socket.userId, {
      socketId: socket.id,
      user: socket.user,
      connectionState: "connected",
      lastHeartbeat: Date.now(),
    });

    socket.connectionState = "connected";

    // Setup heartbeat monitoring
    const heartbeatTimer = setInterval(() => {
      const userData = activeUsers.get(socket.userId);
      if (userData && Date.now() - userData.lastHeartbeat > connectionTimeout) {
        console.log(
          `[TIMEOUT] User ${socket.userId} heartbeat timeout, disconnecting`,
        );
        socket.disconnect(true);
      }
    }, heartbeatInterval);

    socket.heartbeatTimer = heartbeatTimer;

    // Atomic classroom join with locking to prevent race conditions
    // --- Inside socketServer.js (join-classroom event) ---
    socket.on("join-classroom", ({ sessionId, role }) => {
      socket.join(sessionId);

      if (!classroomParticipants.has(sessionId)) {
        classroomParticipants.set(sessionId, new Map());
      }

      // Cross-device safety: Purane stale socket map ko overwrite karein instantly
      classroomParticipants.get(sessionId).set(socket.userId, {
        socketId: socket.id,
        role,
        joinedAt: new Date(),
      });

      // Pure Room ko notify karein (including cross-device broadcast buffers)
      io.to(sessionId).emit("user-joined", {
        userId: socket.userId,
        role,
        fullname: socket.user.fullname,
      });

      // Compile full dynamic active list
      const participants = Array.from(
        classroomParticipants.get(sessionId).entries(),
      ).map(([userId, data]) => {
        // Direct source identification directly from the active socket room pool
        const targetSocket = io.sockets.sockets.get(data.socketId);
        return {
          userId,
          role: data.role,
          fullname: targetSocket?.user?.fullname || "LMS Student",
          joinedAt: data.joinedAt,
        };
      });

      // Target socket backup connection force check
      io.to(socket.id).emit("participants-list", participants);
    });

    socket.on("leave-classroom", ({ sessionId }) => {
      console.log(`[LEAVE] User ${socket.userId} leaving session ${sessionId}`);

      socket.leave(sessionId);

      if (classroomParticipants.has(sessionId)) {
        const participants = classroomParticipants.get(sessionId);
        participants.delete(socket.userId);

        // Notify others
        socket.to(sessionId).emit("user-left", {
          userId: socket.userId,
          fullname: socket.user.fullname,
          timestamp: Date.now(),
        });

        // Clean up empty sessions
        if (participants.size === 0) {
          classroomParticipants.delete(sessionId);
          connectionLocks.delete(sessionId);
          console.log(`[CLEANUP] Session ${sessionId} removed (empty)`);
        }
      }
    });

    // --- WebRTC Core Audio/Video Line Distribution ---
    // STRICT RULE: Only TEACHER initiates connections to prevent dual-initiator collisions
    socket.on("webrtc-offer", ({ sessionId, offer, toUserId }) => {
      const targetUserData = activeUsers.get(toUserId);
      if (!targetUserData) {
        console.log(`[WEBRTC] Target user ${toUserId} not found for offer`);
        return;
      }

      const targetSocket = io.sockets.sockets.get(targetUserData.socketId);
      if (!targetSocket) {
        console.log(
          `[WEBRTC] Target socket ${targetUserData.socketId} not found`,
        );
        return;
      }

      console.log(`[WEBRTC OFFER] From ${socket.userId} to ${toUserId}`);
      targetSocket.emit("webrtc-offer", {
        offer,
        fromUserId: socket.userId,
        fromFullname: socket.user.fullname,
        timestamp: Date.now(),
      });
    });

    socket.on("webrtc-answer", ({ sessionId, answer, toUserId }) => {
      const targetUserData = activeUsers.get(toUserId);
      if (!targetUserData) {
        console.log(`[WEBRTC] Target user ${toUserId} not found for answer`);
        return;
      }

      const targetSocket = io.sockets.sockets.get(targetUserData.socketId);
      if (!targetSocket) {
        console.log(
          `[WEBRTC] Target socket ${targetUserData.socketId} not found`,
        );
        return;
      }

      console.log(`[WEBRTC ANSWER] From ${socket.userId} to ${toUserId}`);
      targetSocket.emit("webrtc-answer", {
        answer,
        fromUserId: socket.userId,
        timestamp: Date.now(),
      });
    });

    socket.on("webrtc-ice-candidate", ({ sessionId, candidate, toUserId }) => {
      const targetUserData = activeUsers.get(toUserId);
      if (!targetUserData) {
        return; // Silently drop ICE candidates for disconnected users
      }

      const targetSocket = io.sockets.sockets.get(targetUserData.socketId);
      if (!targetSocket) {
        return;
      }

      targetSocket.emit("webrtc-ice-candidate", {
        candidate,
        fromUserId: socket.userId,
        timestamp: Date.now(),
      });
    });

    // --- Screen Share Routing Matrices ---
    socket.on("screen-share-offer", ({ sessionId, offer, toUserId }) => {
      if (toUserId) {
        const targetUserData = activeUsers.get(toUserId);
        if (targetUserData) {
          const targetSocket = io.sockets.sockets.get(targetUserData.socketId);
          if (targetSocket) {
            console.log(
              `[SCREEN SHARE] Offer from ${socket.userId} to ${toUserId}`,
            );
            targetSocket.emit("screen-share-offer", {
              offer,
              fromUserId: socket.userId,
              fromFullname: socket.user.fullname,
              timestamp: Date.now(),
            });
          }
        }
      } else {
        // Broadcast to all in room
        console.log(
          `[SCREEN SHARE] Broadcast from ${socket.userId} to room ${sessionId}`,
        );
        socket.to(sessionId).emit("screen-share-offer", {
          offer,
          fromUserId: socket.userId,
          fromFullname: socket.user.fullname,
          timestamp: Date.now(),
        });
      }
    });

    socket.on("screen-share-answer", ({ sessionId, answer, toUserId }) => {
      const targetUserData = activeUsers.get(toUserId);
      if (targetUserData) {
        const targetSocket = io.sockets.sockets.get(targetUserData.socketId);
        if (targetSocket) {
          targetSocket.emit("screen-share-answer", {
            answer,
            fromUserId: socket.userId,
            timestamp: Date.now(),
          });
        }
      }
    });

    socket.on(
      "screen-share-ice-candidate",
      ({ sessionId, candidate, toUserId }) => {
        const targetUserData = activeUsers.get(toUserId);
        if (targetUserData) {
          const targetSocket = io.sockets.sockets.get(targetUserData.socketId);
          if (targetSocket) {
            targetSocket.emit("screen-share-ice-candidate", {
              candidate,
              fromUserId: socket.userId,
              timestamp: Date.now(),
            });
          }
        }
      },
    );

    socket.on("stop-screen-share", ({ sessionId }) => {
      console.log(`[SCREEN SHARE] Stop from ${socket.userId}`);
      socket.to(sessionId).emit("stop-screen-share", {
        fromUserId: socket.userId,
        fromFullname: socket.user.fullname,
        timestamp: Date.now(),
      });
    });

    // --- Media Hardware Mappings & Room Toggles ---
    socket.on("toggle-audio", ({ sessionId, isMuted }) => {
      socket.to(sessionId).emit("user-audio-toggled", {
        userId: socket.userId,
        isMuted,
        fullname: socket.user.fullname,
      });
    });

    socket.on("toggle-video", ({ sessionId, isVideoOff }) => {
      socket.to(sessionId).emit("user-video-toggled", {
        userId: socket.userId,
        isVideoOff,
        fullname: socket.user.fullname,
      });
    });

    socket.on("raise-hand", ({ sessionId }) => {
      socket.to(sessionId).emit("hand-raised", {
        userId: socket.userId,
        fullname: socket.user.fullname,
      });
    });

    socket.on("lower-hand", ({ sessionId }) => {
      socket.to(sessionId).emit("hand-lowered", {
        userId: socket.userId,
        fullname: socket.user.fullname,
      });
    });

    // --- Teacher Control Mod Commands ---
    socket.on("approve-speak", ({ sessionId, studentUserId }) => {
      io.to(sessionId).emit("speak-approved", {
        studentUserId,
        approvedBy: socket.userId,
      });
    });

    socket.on("mute-student", ({ sessionId, studentUserId }) => {
      io.to(sessionId).emit("student-muted", {
        studentUserId,
        mutedBy: socket.userId,
      });
    });

    socket.on("mute-all", ({ sessionId }) => {
      io.to(sessionId).emit("all-muted", {
        mutedBy: socket.userId,
      });
    });

    // --- Text Messaging Chat Context ---
    socket.on("send-chat", ({ sessionId, message }) => {
      const messageData = {
        sender: socket.userId,
        senderFullname: socket.user.fullname,
        message,
        timestamp: new Date(),
      };
      io.to(sessionId).emit("chat-message", messageData);
    });

    socket.on("typing-start", ({ sessionId }) => {
      socket.to(sessionId).emit("user-typing", {
        userId: socket.userId,
        fullname: socket.user.fullname,
      });
    });

    socket.on("typing-stop", ({ sessionId }) => {
      socket.to(sessionId).emit("user-stopped-typing", {
        userId: socket.userId,
      });
    });

    // Heartbeat/ping handler
    socket.on("heartbeat", () => {
      const userData = activeUsers.get(socket.userId);
      if (userData) {
        userData.lastHeartbeat = Date.now();
      }
    });

    // Graceful disconnect with cleanup
    socket.on("disconnect", (reason) => {
      console.log(
        `[DISCONNECT] User ${socket.userId} disconnected. Reason: ${reason}`,
      );

      // Clear heartbeat timer
      if (socket.heartbeatTimer) {
        clearInterval(socket.heartbeatTimer);
      }

      // Update connection state
      const userData = activeUsers.get(socket.userId);
      if (userData) {
        userData.connectionState = "disconnected";
      }

      // Remove from active users (but keep data for potential reconnection)
      // We'll clean up after connection timeout
      setTimeout(() => {
        const currentData = activeUsers.get(socket.userId);
        if (currentData && currentData.connectionState === "disconnected") {
          activeUsers.delete(socket.userId);
          console.log(
            `[CLEANUP] User ${socket.userId} removed from active users`,
          );
        }
      }, connectionTimeout);

      // Remove from all classroom participants
      classroomParticipants.forEach((participants, sessionId) => {
        if (participants.has(socket.userId)) {
          const participant = participants.get(socket.userId);
          participant.connectionState = "disconnected";

          // Notify others
          socket.to(sessionId).emit("user-left", {
            userId: socket.userId,
            fullname: socket.user.fullname,
            timestamp: Date.now(),
          });

          // Clean up after timeout (allow for reconnection)
          setTimeout(() => {
            const currentParticipant = participants.get(socket.userId);
            if (
              currentParticipant &&
              currentParticipant.connectionState === "disconnected"
            ) {
              participants.delete(socket.userId);
              console.log(
                `[CLEANUP] User ${socket.userId} removed from session ${sessionId}`,
              );

              if (participants.size === 0) {
                classroomParticipants.delete(sessionId);
                connectionLocks.delete(sessionId);
                console.log(`[CLEANUP] Session ${sessionId} removed (empty)`);
              }
            }
          }, connectionTimeout);
        }
      });
    });
  });

  return io;
};

export const getClassroomParticipants = (sessionId) => {
  if (!classroomParticipants.has(sessionId)) return [];
  return Array.from(classroomParticipants.get(sessionId).entries())
    .filter(([userId, data]) => data.connectionState !== "disconnected")
    .map(([userId, data]) => ({
      userId,
      role: data.role,
      joinedAt: data.joinedAt,
      connectionState: data.connectionState,
    }));
};

export const isUserInClassroom = (sessionId, userId) => {
  if (!classroomParticipants.has(sessionId)) return false;
  const participant = classroomParticipants.get(sessionId).get(userId);
  return participant && participant.connectionState !== "disconnected";
};

export const getUserSocketId = (userId) => {
  const userData = activeUsers.get(userId);
  return userData?.socketId || null;
};

export const getConnectionState = (userId) => {
  const userData = activeUsers.get(userId);
  return userData?.connectionState || "unknown";
};
