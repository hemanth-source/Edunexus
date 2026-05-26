import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { seedDatabase } from "./seeder.ts";

// connect our db
export const connectDB = async () => {
  try {
    let mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
      console.log("ℹ️ No MONGO_URL provided. Starting in-memory MongoDB server...");
      const mongoServer = await MongoMemoryServer.create();
      mongoUrl = mongoServer.getUri();
      console.log(`✅ In-memory MongoDB Server started at: ${mongoUrl}`);
    }
    const conn = await mongoose.connect(mongoUrl as string);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Seed default demo data if empty
    await seedDatabase();
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
    process.exit(1); // Exit process with failure
  }
};
