import { Request, Response } from "express";
import { db } from "../db/db";
import { notifications } from "../db/schema";
import { and, desc, eq } from "drizzle-orm";

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.id))
      .limit(30);
    return res.json({ notifications: rows });
  } catch (err) {
    console.error("[getNotifications]", err);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

export const markAllRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return res.json({ success: true });
  } catch (err) {
    console.error("[markAllRead]", err);
    return res.status(500).json({ error: "Failed to mark notifications as read" });
  }
};
