import mongoose from "mongoose";

const connectDB = async () => {

    try {

        const conn = await mongoose.connect(
            process.env.MONGO_URI,
            {
                serverSelectionTimeoutMS: 10000,
            }
        );

        console.log(
            `MongoDB Connected: ${conn.connection.host}`
        );


        // MongoDB connection events
        mongoose.connection.on(
            "error",
            (error) => {

                console.error(
                    "❌ MongoDB connection error:",
                    error.message
                );

            }
        );


        mongoose.connection.on(
            "disconnected",
            () => {

                console.warn(
                    "⚠️ MongoDB disconnected. Mongoose will attempt to reconnect."
                );

            }
        );


        mongoose.connection.on(
            "reconnected",
            () => {

                console.log(
                    "✅ MongoDB reconnected."
                );

            }
        );


        return conn;

    } catch (error) {

        console.error(
            "❌ MongoDB connection failed:",
            error.message
        );

        throw error;

    }

};


export default connectDB;