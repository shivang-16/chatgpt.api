import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let db: mongoose.Connection;
const ConnectToDB = async () => {
  const DatabaseUrl = process.env.DB_URL as string;

  try {
    await mongoose.connect(DatabaseUrl);
    db = mongoose.connection;
    console.log("Database Connected.");
  } catch (error) {
    console.log(error);
  }
};

export  {db};

export default ConnectToDB;
