import { NextFunction, Request, Response } from "express";
import { CustomError } from "./error";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User} from "../models/userModel";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
export const checkAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let token;

  // Check for token in cookies
  if (req.cookies.token) {
    token = req.cookies.token;
  }
  // Check for token in Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return next(new CustomError("Login First", 401));

  const secret = process.env.JWT_SECRET;
  if (!secret) return next(new CustomError("Jwt Secret not defined", 400));

  const decoded = jwt.verify(token, secret) as JwtPayload;
  req.user = await User.findById(decoded.id);

  next();
};


export const isVerified = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.user.status !== "Verified")
    return next(new CustomError("Your are not verified", 400));

  next();
};
