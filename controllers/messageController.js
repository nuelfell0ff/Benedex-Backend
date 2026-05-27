import Message from "../models/Message.js";



// Save direct message
export const sendMessage = async (req, res) => {

  try {

    const message =
      await Message.create({

        sender: req.user._id,
        receiver: req.body.receiver,
        message: req.body.message

      });

    res.status(201).json(
      message
    );

  }

  catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};




// Conversation history
export const getMessages =
  async (req, res) => {

    try {

      const messages =
        await Message.find({

          $or: [

            {
              sender: req.user._id,
              receiver: req.params.userId
            },

            {
              sender: req.params.userId,
              receiver: req.user._id
            }

          ]

        })

          .populate(
            "sender",
            "fullName profileImage"
          )

          .sort({
            createdAt: 1
          });


      res.json(messages);

    }

    catch (error) {

      res.status(500).json({
        message: error.message
      });

    }

  };