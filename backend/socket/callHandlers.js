import callService from "../services/callService.js";
import { ActiveUsers } from "../Models/index.js";

const getUserSocketId = async (userId) => {
  const activeUser = await ActiveUsers.findOne({ where: { user_id: userId } });
  return activeUser?.socket_id || null;
};

export const registerCallHandlers = (io, socket) => {

  // 📞 CALL USER
  socket.on("call_user", async ({ receiverId, conversationId }) => {
    try {
      // ✅ Get callerId from socket session — never trust client
      const callerId = socket.userId;

      if (!callerId) {
        return socket.emit("call_error", { message: "Unauthorized" });
      }

      // Check if receiver is busy
      const activeCall = await callService.getActiveCallByUser(receiverId);
      if (activeCall) {
        return socket.emit("call_busy", { receiverId });
      }

      // Create call record in DB
      const call = await callService.createCall({
        conversation_id: conversationId,
        caller_id: callerId,
        receiver_id: receiverId,
      });

      await callService.logEvent(call.id, "initiated", callerId);

      const receiverSocket = await getUserSocketId(receiverId);

      // ✅ Handle missed call — receiver is offline
      if (!receiverSocket) {
        await callService.updateCallStatus(call.id, "missed");
        await callService.logEvent(call.id, "missed", callerId);
        return socket.emit("call_missed", { callId: call.id });
      }

      // Notify receiver
      io.to(receiverSocket).emit("incoming_call", {
        callId: call.id,
        callerId,
        conversationId,
      });

      await callService.updateCallStatus(call.id, "ringing");
      await callService.logEvent(call.id, "ringing", callerId);

    } catch (err) {
      console.error("call_user error:", err);
      socket.emit("call_error", { message: "Failed to initiate call" });
    }
  });

  // ✅ ACCEPT CALL
  socket.on("accept_call", async ({ callId, userId }) => {
    try {
      const call = await callService.updateCallStatus(callId, "accepted");
      if (!call) return;

      await callService.logEvent(callId, "accepted", userId);

      // ✅ Mark call as connected — sets started_at for duration tracking
      await callService.markConnected(callId);
      await callService.logEvent(callId, "connected", userId);

      const callerSocket = await getUserSocketId(call.caller_id);
      if (callerSocket) {
        io.to(callerSocket).emit("call_accepted", { callId });
      }

    } catch (err) {
      console.error("accept_call error:", err);
      socket.emit("call_error", { message: "Failed to accept call" });
    }
  });

  // ❌ REJECT CALL
  socket.on("reject_call", async ({ callId, userId }) => {
    try {
      const call = await callService.updateCallStatus(callId, "rejected");
      if (!call) return;

      await callService.logEvent(callId, "rejected", userId);

      const callerSocket = await getUserSocketId(call.caller_id);
      if (callerSocket) {
        io.to(callerSocket).emit("call_rejected", { callId });
      }

    } catch (err) {
      console.error("reject_call error:", err);
      socket.emit("call_error", { message: "Failed to reject call" });
    }
  });

  // 🔚 END CALL
  socket.on("end_call", async ({ callId, userId }) => {
    try {
      const call = await callService.endCall(callId, userId);
      if (!call) return;

      await callService.logEvent(callId, "ended", userId);

      const otherUserId =
        call.caller_id === userId ? call.receiver_id : call.caller_id;

      const otherSocket = await getUserSocketId(otherUserId);
      if (otherSocket) {
        io.to(otherSocket).emit("call_ended", { callId });
      }

    } catch (err) {
      console.error("end_call error:", err);
      socket.emit("call_error", { message: "Failed to end call" });
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // 📡 WebRTC RELAY HANDLERS
  // Backend just relays these between peers — no WebRTC processing here
  // ────────────────────────────────────────────────────────────────────────

  // 📡 RELAY OFFER — Caller → Callee
  socket.on("webrtc_offer", async ({ callId, offer, receiverId }) => {
    try {
      const receiverSocket = await getUserSocketId(receiverId);
      if (receiverSocket) {
        io.to(receiverSocket).emit("webrtc_offer", { callId, offer });
        console.log(`📡 WebRTC offer relayed → receiverId: ${receiverId}`);
      }
    } catch (err) {
      console.error("webrtc_offer error:", err);
    }
  });

  // 📡 RELAY ANSWER — Callee → Caller
  socket.on("webrtc_answer", async ({ callId, answer, callerId }) => {
    try {
      const callerSocket = await getUserSocketId(callerId);
      if (callerSocket) {
        io.to(callerSocket).emit("webrtc_answer", { callId, answer });
        console.log(`📡 WebRTC answer relayed → callerId: ${callerId}`);
      }
    } catch (err) {
      console.error("webrtc_answer error:", err);
    }
  });

  // 📡 RELAY ICE CANDIDATES — Both directions
  socket.on("ice_candidate", async ({ callId, candidate, toUserId }) => {
    try {
      const targetSocket = await getUserSocketId(toUserId);
      if (targetSocket) {
        io.to(targetSocket).emit("ice_candidate", { callId, candidate });
      }
    } catch (err) {
      console.error("ice_candidate error:", err);
    }
  });

};