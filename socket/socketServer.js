import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../model/User.js";

const activeUsers = new Map();
const classroomParticipants = new Map();

export const initializeSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

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
      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId}`);
    activeUsers.set(socket.userId, socket.id);

    socket.on("join-classroom", ({ sessionId, role }) => {
      socket.join(sessionId);

      if (!classroomParticipants.has(sessionId)) {
        classroomParticipants.set(sessionId, new Map());
      }
      classroomParticipants.get(sessionId).set(socket.userId, {
        socketId: socket.id,
        role,
        joinedAt: new Date(),
      });

      // Notify other existing users that a new member has landed
      socket.to(sessionId).emit("user-joined", {
        userId: socket.userId,
        role,
        fullname: socket.user.fullname,
      });

      // Compile current participants list to return back down the pipeline
      const participants = Array.from(
        classroomParticipants.get(sessionId).entries(),
      ).map(([userId, data]) => {
        const userSocket = activeUsers.get(userId);
        const user = userSocket
          ? io.sockets.sockets.get(userSocket)?.user
          : null;
        return {
          userId,
          role: data.role,
          fullname: user?.fullname || "Unknown",
          joinedAt: data.joinedAt,
        };
      });

      socket.emit("participants-list", participants);
    });

    socket.on("leave-classroom", ({ sessionId }) => {
      socket.leave(sessionId);
      if (classroomParticipants.has(sessionId)) {
        classroomParticipants.get(sessionId).delete(socket.userId);
        socket.to(sessionId).emit("user-left", {
          userId: socket.userId,
          fullname: socket.user.fullname,
        });
        if (classroomParticipants.get(sessionId).size === 0) {
          classroomParticipants.delete(sessionId);
        }
      }
    });

    // --- WebRTC Core Audio/Video Line Distribution ---
    socket.on("webrtc-offer", ({ sessionId, offer, toUserId }) => {
      const targetSocketId = activeUsers.get(toUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc-offer", {
          offer,
          fromUserId: socket.userId,
          fromFullname: socket.user.fullname,
        });
      }
    });

    socket.on("webrtc-answer", ({ sessionId, answer, toUserId }) => {
      const targetSocketId = activeUsers.get(toUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc-answer", {
          answer,
          fromUserId: socket.userId,
        });
      }
    });

    socket.on("webrtc-ice-candidate", ({ sessionId, candidate, toUserId }) => {
      const targetSocketId = activeUsers.get(toUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc-ice-candidate", {
          candidate,
          fromUserId: socket.userId,
        });
      }
    });

    // --- CRITICAL FIXED: Screen Share Routing Matrices ---
    socket.on("screen-share-offer", ({ sessionId, offer, toUserId }) => {
      // If client targets a specific user, route directly, else map array down to room
      if (toUserId) {
        const targetSocketId = activeUsers.get(toUserId);
        if (targetSocketId) {
          io.to(targetSocketId).emit("screen-share-offer", {
            offer,
            fromUserId: socket.userId,
            fromFullname: socket.user.fullname,
          });
        }
      } else {
        // Fallback backward compatibility layer for generic signals
        socket.to(sessionId).emit("screen-share-offer", {
          offer,
          fromUserId: socket.userId,
          fromFullname: socket.user.fullname,
          isLegacyRoomBroadcast: true,
        });
      }
    });

    socket.on("screen-share-answer", ({ sessionId, answer, toUserId }) => {
      const targetSocketId = activeUsers.get(toUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("screen-share-answer", {
          answer,
          fromUserId: socket.userId,
        });
      }
    });

    socket.on(
      "screen-share-ice-candidate",
      ({ sessionId, candidate, toUserId }) => {
        const targetSocketId = activeUsers.get(toUserId);
        if (targetSocketId) {
          io.to(targetSocketId).emit("screen-share-ice-candidate", {
            candidate,
            fromUserId: socket.userId,
          });
        }
      },
    );

    socket.on("stop-screen-share", ({ sessionId }) => {
      socket.to(sessionId).emit("stop-screen-share", {
        fromUserId: socket.userId,
        fromFullname: socket.user.fullname,
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

    socket.on("disconnect", () => {
      console.log(`User disconnected from node: ${socket.userId}`);
      activeUsers.delete(socket.userId);

      classroomParticipants.forEach((participants, sessionId) => {
        if (participants.has(socket.userId)) {
          participants.delete(socket.userId);
          socket.to(sessionId).emit("user-left", {
            userId: socket.userId,
            fullname: socket.user.fullname,
          });
          if (participants.size === 0) {
            classroomParticipants.delete(sessionId);
          }
        }
      });
    });
  });

  return io;
};

export const getClassroomParticipants = (sessionId) => {
  if (!classroomParticipants.has(sessionId)) return [];
  return Array.from(classroomParticipants.get(sessionId).entries()).map(
    ([userId, data]) => ({
      userId,
      role: data.role,
      joinedAt: data.joinedAt,
    }),
  );
};

export const isUserInClassroom = (sessionId, userId) => {
  if (!classroomParticipants.has(sessionId)) return false;
  return classroomParticipants.get(sessionId).has(userId);
};

export const getUserSocketId = (userId) => {
  return activeUsers.get(userId);
};
