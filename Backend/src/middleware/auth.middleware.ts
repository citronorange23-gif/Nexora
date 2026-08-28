import type {
  NextFunction,
  Request,
  Response,
} from "express";

import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    organizationId: string;
    roleId: string;
    role: string;
  };
}

interface JwtPayload {
  userId: string;
  organizationId: string;
  roleId: string;
  role: string;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    });
  }

  const token = authorization.substring(7);

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return res.status(500).json({
      success: false,
      error: "Authentication is not configured",
    });
  }

    try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    (req as AuthenticatedRequest).user = {
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      roleId: decoded.roleId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: "Token expired",
      });
    }

    console.error("JWT verify error:", error);

    return res.status(401).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
}