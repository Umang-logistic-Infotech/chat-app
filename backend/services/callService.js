import Calls from "../Models/Calls.js";
import CallEvents from "../Models/CallEvents.js";

import { Op } from "sequelize";

const ACTIVE_STATUSES = ["initiated", "ringing", "connecting", "connected"];

const callService = {
  async createCall({ conversation_id, caller_id, receiver_id, type = "audio" }) {
    const call = await Calls.create({
      conversation_id,
      caller_id,
      receiver_id,
      type,
      status: "initiated",
    });

    return call;
  },

  async getActiveCallByUser(userId) {
    return await Calls.findOne({
      where: {
          status: { [Op.in]: ACTIVE_STATUSES },
        
          [Op.or]: [
            { caller_id: userId },
            { receiver_id: userId },
          ],

      },
    });
  },

  async updateCallStatus(callId, status) {
    const call = await Calls.findByPk(callId);
    if (!call) return null;

    await call.update({ status });
    return call;
  },

  async markConnected(callId) {
    const call = await Calls.findByPk(callId);
    if (!call) return null;

    await call.update({
      status: "connected",
      started_at: new Date(),
    });

    return call;
  },

  async endCall(callId, ended_by) {
    const call = await Calls.findByPk(callId);
    if (!call) return null;

    const ended_at = new Date();
    let duration = null;

    if (call.started_at) {
      duration = Math.floor((ended_at - call.started_at) / 1000);
    }

    await call.update({
      status: "ended",
      ended_at,
      duration,
      ended_by,
    });

    return call;
  },

  async logEvent(call_id, event_type, user_id = null, metadata = null) {
    try {
      await CallEvents.create({
        call_id,
        event_type,
        user_id,
        metadata,
      });
    } catch (err) {
      console.error("Call event error:", err.message);
    }
  },
};

export default callService;