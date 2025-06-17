import { Request, Response, NextFunction } from "express";
import {User} from "../../models/userModel";
import { CustomError } from "../../middleware/error";
import setCookie from "../../utils/setCookies";

// Remove hashPassword function as it's no longer needed

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    // Bcrypt hashing is now handled in the userModel pre-save hook

    const firstname = name.split(" ")[0];
    const lastname = name.split(" ")[1];
    const newUser = new User({
      firstname,
      lastname,
      email,
      password, // Pass plain password, pre-save hook will hash it
    });

    await newUser.save();

    setCookie({
      user: newUser,
      res,
      next,
      message: "Login Success",
      statusCode: 200,
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error: any) {
    console.log(error);
    next(new CustomError(error.message));
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email }).select('+password'); // Only select password, salt is not needed
    if (!user) {
      console.log("User not found");
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Compare password using bcrypt
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log("Invalid password");
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    setCookie({
      user,
      res,
      next,
      message: "Login Success",
      statusCode: 200,
    });
    res.status(200).json({ message: 'Logged in successfully' });
  } catch (error: any) {
    console.log(error);
    next(new CustomError(error.message));
  }
};


export const logout = async (req: Request, res: Response) => {
  res
    .status(200)
    .cookie("token", null, {
      expires: new Date(Date.now()),
    })
    .json({
      success: true,
      message: "Logged out",
    });
};

export const getUser = async(
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user)
      return next(new CustomError("User not found", 400));

    res.status(200).json({
      success: true,
      user
    });

  } catch (error: any) {
    next(new CustomError(error.message));
  }
}