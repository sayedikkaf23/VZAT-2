import mongoose from "mongoose";
import dotenv from "dotenv";

//dotenv.config();

const envFile = process.env.NODE_ENV ***REMOVED***= 'production' ? '.env.production' : '.env.sandbox';
dotenv.config({ path: envFile });

// const password = encodeURIComponent("Saaral@3112025");
// console.log(password);


const connectDB = async () => { 
  try {
    await mongoose
      .connect(process.env.MONGODB_URI)
      //.connect(`mongodb+srv://saaral-naveen_31:${password}@sneha.1kspldn.mongodb.net/`)
      .then(() => {
        console.log(`MongoDB Connected`);
      })
      .catch((err) => {
        console.error("Error connecting to mongo", err);
      });
  } catch (error) {
    console.error(`Error:${error.message}`);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose
      .connection.close()
      .then(() => console.log("DB disconnected Successfully"))
      .catch((err) => console.log(err.message));
  } catch (error) {
    console.error(`Error:${error.message}`);
    process.exit(1);
  }
};
export { connectDB, disconnectDB };

