import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../model/User.js";

// Store active users and their socket IDs
const activeUsers = new Map();
// Store classroom room participants
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

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token || socket.handshake.headers.authorization;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      // Remove 'Bearer ' prefix if present
      const tokenString = token.startsWith("Bearer ") ? token.slice(7) : token;

      // Verify token
      const decoded = jwt.verify(tokenString, process.env.JWT_SECRET);

      // Get user from database
      const user = await User.findById(
        decoded.id || decoded._id || decoded.userId,
      );

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      // Attach user to socket
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

    // Store socket ID for user
    activeUsers.set(socket.userId, socket.id);

    // Join classroom room
    socket.on("join-classroom", ({ sessionId, role }) => {
      socket.join(sessionId);

      // Add to classroom participants
      if (!classroomParticipants.has(sessionId)) {
        classroomParticipants.set(sessionId, new Map());
      }
      classroomParticipants.get(sessionId).set(socket.userId, {
        socketId: socket.id,
        role,
        joinedAt: new Date(),
      });

      console.log(
        `User ${socket.userId} joined classroom ${sessionId} as ${role}`,
      );

      // Notify others in the room
      socket.to(sessionId).emit("user-joined", {
        userId: socket.userId,
        role,
        fullname: socket.user.fullname,
      });

      // Send current participants list to the new user
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

    // Leave classroom room
    socket.on("leave-classroom", ({ sessionId }) => {
      socket.leave(sessionId);

      // Remove from classroom participants
      if (classroomParticipants.has(sessionId)) {
        classroomParticipants.get(sessionId).delete(socket.userId);

        // Notify others
        socket.to(sessionId).emit("user-left", {
          userId: socket.userId,
          fullname: socket.user.fullname,
        });

        // Clean up if room is empty
        if (classroomParticipants.get(sessionId).size === 0) {
          classroomParticipants.delete(sessionId);
        }
      }

      console.log(`User ${socket.userId} left classroom ${sessionId}`);
    });

    // WebRTC Signaling Events

    // Offer (teacher initiates connection)
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

    // Answer (student responds)
    socket.on("webrtc-answer", ({ sessionId, answer, toUserId }) => {
      const targetSocketId = activeUsers.get(toUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc-answer", {
          answer,
          fromUserId: socket.userId,
        });
      }
    });

    // ICE candidates
    socket.on("webrtc-ice-candidate", ({ sessionId, candidate, toUserId }) => {
      const targetSocketId = activeUsers.get(toUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc-ice-candidate", {
          candidate,
          fromUserId: socket.userId,
        });
      }
    });

    // Screen share offer
    socket.on("screen-share-offer", ({ sessionId, offer }) => {
      socket.to(sessionId).emit("screen-share-offer", {
        offer,
        fromUserId: socket.userId,
        fromFullname: socket.user.fullname,
      });
    });

    // Screen share answer
    socket.on("screen-share-answer", ({ sessionId, answer, toUserId }) => {
      const targetSocketId = activeUsers.get(toUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("screen-share-answer", {
          answer,
          fromUserId: socket.userId,
        });
      }
    });

    // Screen share ICE candidates
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

    // Stop screen share
    socket.on("stop-screen-share", ({ sessionId }) => {
      socket.to(sessionId).emit("stop-screen-share", {
        fromUserId: socket.userId,
        fromFullname: socket.user.fullname,
      });
    });

    // Audio/Video Control Events

    // Mute/Unmute
    socket.on("toggle-audio", ({ sessionId, isMuted }) => {
      socket.to(sessionId).emit("user-audio-toggled", {
        userId: socket.userId,
        isMuted,
        fullname: socket.user.fullname,
      });
    });

    // Video On/Off
    socket.on("toggle-video", ({ sessionId, isVideoOff }) => {
      socket.to(sessionId).emit("user-video-toggled", {
        userId: socket.userId,
        isVideoOff,
        fullname: socket.user.fullname,
      });
    });

    // Request to speak (student raises hand)
    socket.on("raise-hand", ({ sessionId }) => {
      socket.to(sessionId).emit("hand-raised", {
        userId: socket.userId,
        fullname: socket.user.fullname,
      });
    });

    // Lower hand
    socket.on("lower-hand", ({ sessionId }) => {
      socket.to(sessionId).emit("hand-lowered", {
        userId: socket.userId,
        fullname: socket.user.fullname,
      });
    });

    // Teacher approves/unmutes student
    socket.on("approve-speak", ({ sessionId, studentUserId }) => {
      io.to(sessionId).emit("speak-approved", {
        studentUserId,
        approvedBy: socket.userId,
      });
    });

    // Teacher mutes a specific student
    socket.on("mute-student", ({ sessionId, studentUserId }) => {
      io.to(sessionId).emit("student-muted", {
        studentUserId,
        mutedBy: socket.userId,
      });
    });

    // Teacher mutes all students
    socket.on("mute-all", ({ sessionId }) => {
      io.to(sessionId).emit("all-muted", {
        mutedBy: socket.userId,
      });
    });

    // Chat Events

    // Send chat message
    socket.on("send-chat", ({ sessionId, message }) => {
      const messageData = {
        sender: socket.userId,
        senderFullname: socket.user.fullname,
        message,
        timestamp: new Date(),
      };

      // Broadcast to room
      io.to(sessionId).emit("chat-message", messageData);
    });

    // Typing indicator
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

    // Error handling
    socket.on("error", (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.userId}`);

      // Remove from active users
      activeUsers.delete(socket.userId);

      // Remove from all classroom rooms
      classroomParticipants.forEach((participants, sessionId) => {
        if (participants.has(socket.userId)) {
          participants.delete(socket.userId);

          // Notify others
          socket.to(sessionId).emit("user-left", {
            userId: socket.userId,
            fullname: socket.user.fullname,
          });

          // Clean up if room is empty
          if (participants.size === 0) {
            classroomParticipants.delete(sessionId);
          }
        }
      });
    });
  });

  return io;
};

// Helper function to get participants in a classroom
export const getClassroomParticipants = (sessionId) => {
  if (!classroomParticipants.has(sessionId)) {
    return [];
  }
  return Array.from(classroomParticipants.get(sessionId).entries()).map(
    ([userId, data]) => ({
      userId,
      role: data.role,
      joinedAt: data.joinedAt,
    }),
  );
};

// Helper function to check if user is in a classroom
export const isUserInClassroom = (sessionId, userId) => {
  if (!classroomParticipants.has(sessionId)) {
    return false;
  }
  return classroomParticipants.get(sessionId).has(userId);
};

// Helper function to get user's socket ID
export const getUserSocketId = (userId) => {
  return activeUsers.get(userId);
};
