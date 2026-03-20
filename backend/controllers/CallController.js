import { Calls, Users } from "../Models/index.js";

import { Op } from "sequelize";


const CallController = {
  // 📞 Get all calls for a conversation
  async getCallsByConversation(req, res) {
    try {
      const { conversation_id } = req.params;

      if (!conversation_id) {
        return res.status(400).json({
          success: false,
          message: "conversation_id is required",
        });
      }

      const calls = await Calls.findAll({
        where: { conversation_id },
        include: [
          {
            model: Users,
            as: "caller",
            attributes: ["id", "name", "profile_photo"],
          },
          {
            model: Users,
            as: "receiver",
            attributes: ["id", "name", "profile_photo"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return res.status(200).json({
        success: true,
        data: calls,
      });
    } catch (error) {
      console.error("getCallsByConversation error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },

  // 📞 Get single call details
  async getCallDetails(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "call id is required",
        });
      }

      const call = await Calls.findByPk(id, {
        include: [
          {
            model: Users,
            as: "caller",
            attributes: ["id", "name", "profile_photo"],
          },
          {
            model: Users,
            as: "receiver",
            attributes: ["id", "name", "profile_photo"],
          },
        ],
      });

      if (!call) {
        return res.status(404).json({
          success: false,
          message: "Call not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: call,
      });
    } catch (error) {
      console.error("getCallDetails error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },

  // 📊 Get call history for a user (incoming + outgoing)
  async getUserCallHistory(req, res) {
    try {
      const { user_id } = req.params;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: "user_id is required",
        });
      }

      const calls = await Calls.findAll({
        where: {
            [Op.or]: [
                { caller_id: user_id },
                { receiver_id: user_id },
            ],
        },
        include: [
          {
            model: Users,
            as: "caller",
            attributes: ["id", "name", "profile_photo"],
          },
          {
            model: Users,
            as: "receiver",
            attributes: ["id", "name", "profile_photo"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return res.status(200).json({
        success: true,
        data: calls,
      });
    } catch (error) {
      console.error("getUserCallHistory error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
};

export default CallController;