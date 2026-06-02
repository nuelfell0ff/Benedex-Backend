import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import { parseJsonBody } from "./middleware/jsonBodyMiddleware.js";

import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import moduleRoutes from "./routes/moduleRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import rewardRoutes from "./routes/rewardRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import liveClassRoutes from "./routes/liveClassRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import communityRoutes from "./routes/communityRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userManagementRoutes from "./routes/userManagementRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import errorHandler from "./middleware/errorMiddleware.js";
import notFound from "./middleware/notFoundMiddleware.js";
import lessonRoutes from "./routes/lessonRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";

dotenv.config();

connectDB();

const app = express();

const server = http.createServer(app);

const io = new Server(server, {

    cors:{
        origin:"*",
        methods:["GET","POST"]
    }

});



// Middlewares

app.use(

    express.text({

        type:[
            "application/json",
            "application/*+json"
        ]

    })

);

app.use(
    parseJsonBody
);

app.use(

    cors({

        origin:"*"

    })

);




// Routes

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/student",
    studentRoutes
);

app.use(
    "/api/courses",
    courseRoutes
);

app.use(
    "/api/modules",
    moduleRoutes
);

app.use(
    "/api/assignments",
    assignmentRoutes
);

app.use(
    "/api/rewards",
    rewardRoutes
);

app.use(
    "/api/dashboard",
    dashboardRoutes
);

app.use(
    "/api/live-classes",
    liveClassRoutes
);

app.use(
    "/api/notifications",
    notificationRoutes
);

app.use(
    "/api/community",
    communityRoutes
);

app.use(
    "/api/payments",
    paymentRoutes
);

app.use(
    "/api/admin",
    adminRoutes
);

app.use(
    "/api/users",
    userManagementRoutes
);

app.use(
    "/api/settings",
    settingsRoutes
);

app.use(
    "/api/messages",
    messageRoutes
);

app.use(
    "/api/lessons", 
    lessonRoutes
);

app.use(
"/api/quizzes",
quizRoutes
);



app.use(
    notFound
);

app.use(
    errorHandler
);


// Home route

app.get(
    "/",
    (req,res)=>{

        res.json({

            message:"Benedex API running 🚀"

        });

    }
);




// Socket.IO

io.on(

    "connection",

    (socket)=>{

        console.log(
            `User connected: ${socket.id}`
        );



        socket.on(

            "join-room",

            (room)=>{

                socket.join(
                    room
                );

            }

        );



        socket.on(

            "send-message",

            (data)=>{

                io.to(
                    data.room
                ).emit(

                    "receive-message",

                    data

                );

            }

        );



        socket.on(

            "disconnect",

            ()=>{

                console.log(
                    "User disconnected"
                );

            }

        );

    }

);




// Start server

const PORT =
process.env.PORT || 5000;


server.listen(

    PORT,

    ()=>{

        console.log(

            `🚀 Server running on port ${PORT}`

        );

    }

);
