import User from "../models/User.js";
import { applyXpToUser, recordLearningActivity } from "../utils/studentLearning.js";



export const addXP = async (req, res) => {

  try {

    const {

      studentId,
      xp

    } = req.body;


    const user = await User.findById(studentId);


    if (!user) {

      return res.status(404).json({

        message: "Student not found"

      });

    }


    await applyXpToUser(user, xp);

    await recordLearningActivity({
      student: user._id,
      type: "xp_awarded",
      title: `XP awarded: ${xp}`,
      points: xp
    });


    res.json({

      message: "XP updated",

      xp: user.xp,

      badges: user.badges

    });

  }

  catch (error) {

    res.status(500).json({

      message: error.message

    });

  }

};