import { Request, Response } from "express";
import { db } from "../db/db";
import { groupRooms, groupMembers, votes, users, movies, theatres, shows, groupMessages } from "../db/schema";
import { eq, and, asc } from "drizzle-orm";
import crypto from "crypto";
 
// CREATE GROUP ROOM
export const createGroupRoom = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Room name is required" });
 
    const inviteCode = crypto.randomBytes(3).toString("hex").toUpperCase();
 
    const inserted = await db.insert(groupRooms).values({
      name,
      creatorId: user.id,
      inviteCode,
      status: "voting",
    }).returning();
    const newRoom = inserted[0];
 
    await db.insert(groupMembers).values({ roomId: newRoom.id, userId: user.id });
 
    return res.status(201).json({
      message: "Group room created successfully",
      room: newRoom,
      inviteLink: `/group/${inviteCode}`,
    });
  } catch (err) {
    console.error("Create group room error:", err);
    return res.status(500).json({ error: "Internal server error creating group room" });
  }
};
 
// GET GROUP ROOM BY INVITE CODE
export const getGroupRoom = async (req: Request, res: Response) => {
  try {
    const { inviteCode } = req.params;
 
    let dbRooms = await db.select().from(groupRooms).where(eq(groupRooms.inviteCode, inviteCode)).limit(1);
    // Fallback: try by numeric ID
    if (!dbRooms[0] && !isNaN(parseInt(inviteCode))) {
      dbRooms = await db.select().from(groupRooms).where(eq(groupRooms.id, parseInt(inviteCode))).limit(1);
    }
    const room = dbRooms[0];
    if (!room) return res.status(404).json({ error: "Group room not found" });
 
    // Fetch members with user details
    const dbMembers = await db.select().from(groupMembers).where(eq(groupMembers.roomId, room.id));
    const membersList = await Promise.all(
      dbMembers.map(async (m) => {
        const u = await db.select().from(users).where(eq(users.id, m.userId)).limit(1);
        return {
          id: m.id,
          joinedAt: m.joinedAt,
          user: u[0] ? { id: u[0].id, fullName: u[0].fullName, email: u[0].email, profilePic: u[0].profilePic } : null,
        };
      })
    );
 
    const votesList = await db.select().from(votes).where(eq(votes.roomId, room.id));
 
    // Tally votes
    const movieVotes: Record<number, number> = {};
    const theatreVotes: Record<number, number> = {};
    const showtimeVotes: Record<number, number> = {};
 
    votesList.forEach((v) => {
      if (v.voteType === "movie") movieVotes[v.votedId] = (movieVotes[v.votedId] || 0) + 1;
      else if (v.voteType === "theatre") theatreVotes[v.votedId] = (theatreVotes[v.votedId] || 0) + 1;
      else if (v.voteType === "showtime") showtimeVotes[v.votedId] = (showtimeVotes[v.votedId] || 0) + 1;
    });
 
    // Hydrate with real names from PostgreSQL
    const hydratedMovies = await Promise.all(
      Object.entries(movieVotes).map(async ([mId, count]) => {
        const dbMovie = await db.select().from(movies).where(eq(movies.id, parseInt(mId))).limit(1);
        return { id: parseInt(mId), title: dbMovie[0]?.title || `Movie #${mId}`, votes: count };
      })
    );
 
    const hydratedTheatres = await Promise.all(
      Object.entries(theatreVotes).map(async ([tId, count]) => {
        const dbTheatre = await db.select().from(theatres).where(eq(theatres.id, parseInt(tId))).limit(1);
        return { id: parseInt(tId), name: dbTheatre[0]?.name || `Theatre #${tId}`, votes: count };
      })
    );
 
    const hydratedShowtimes = await Promise.all(
      Object.entries(showtimeVotes).map(async ([sId, count]) => {
        const dbShow = await db.select().from(shows).where(eq(shows.id, parseInt(sId))).limit(1);
        return {
          id: parseInt(sId),
          startTime: dbShow[0]?.startTime || `Showtime #${sId}`,
          date: dbShow[0]?.date || "",
          votes: count,
        };
      })
    );
 
    return res.status(200).json({
      room,
      members: membersList,
      votingResults: { movies: hydratedMovies, theatres: hydratedTheatres, showtimes: hydratedShowtimes },
      rawVotes: votesList,
    });
  } catch (err) {
    console.error("Fetch group room error:", err);
    return res.status(500).json({ error: "Internal server error fetching group room" });
  }
};
 
// JOIN GROUP ROOM
export const joinGroupRoom = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: "inviteCode is required" });
 
    const dbRooms = await db.select().from(groupRooms).where(eq(groupRooms.inviteCode, inviteCode.toUpperCase())).limit(1);
    const room = dbRooms[0];
    if (!room) return res.status(404).json({ error: "Invalid invite code" });
 
    const existing = await db.select().from(groupMembers).where(
      and(eq(groupMembers.roomId, room.id), eq(groupMembers.userId, user.id))
    ).limit(1);
 
    if (!existing[0]) {
      await db.insert(groupMembers).values({ roomId: room.id, userId: user.id });
    }
 
    return res.status(200).json({
      message: "Joined group room successfully",
      roomId: room.id,
      roomName: room.name,
      inviteCode: room.inviteCode,
    });
  } catch (err) {
    console.error("Join group room error:", err);
    return res.status(500).json({ error: "Internal server error joining group room" });
  }
};
 
// CAST VOTE
export const castVote = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const roomId = parseInt(req.params.id);
    const { voteType, votedId } = req.body;
 
    if (isNaN(roomId) || !voteType || votedId === undefined) {
      return res.status(400).json({ error: "roomId, voteType, and votedId are required" });
    }
 
    const room = await db.select().from(groupRooms).where(eq(groupRooms.id, roomId)).limit(1);
    if (!room[0]) return res.status(404).json({ error: "Room not found" });
 
    // Remove existing vote of same type by this user
    await db.delete(votes).where(
      and(eq(votes.roomId, roomId), eq(votes.userId, user.id), eq(votes.voteType, voteType))
    );
 
    await db.insert(votes).values({ roomId, userId: user.id, voteType, votedId: parseInt(votedId) });
 
    return res.status(200).json({ message: "Vote submitted successfully" });
  } catch (err) {
    console.error("Cast vote error:", err);
    return res.status(500).json({ error: "Internal server error casting vote" });
  }
};
 
// FINALIZE GROUP ROOM
export const finalizeSelections = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const roomId = parseInt(req.params.id);
    const { movieId, theatreId, showId } = req.body;
 
    if (isNaN(roomId) || !movieId || !theatreId || !showId) {
      return res.status(400).json({ error: "roomId, movieId, theatreId, and showId are required" });
    }
 
    const dbRooms = await db.select().from(groupRooms).where(eq(groupRooms.id, roomId)).limit(1);
    const room = dbRooms[0];
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.creatorId !== user.id) return res.status(403).json({ error: "Only the room creator can finalize plans" });
 
    const updated = await db.update(groupRooms).set({
      status: "finalizing",
      selectedMovieId: parseInt(movieId),
      selectedTheatreId: parseInt(theatreId),
      selectedShowId: parseInt(showId),
    }).where(eq(groupRooms.id, roomId)).returning();
 
    return res.status(200).json({ message: "Group selections finalized!", room: updated[0] });
  } catch (err) {
    console.error("Finalize selections error:", err);
    return res.status(500).json({ error: "Internal server error finalizing selections" });
  }
};
 
// DELETE GROUP ROOM
export const deleteGroupRoom = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const roomId = parseInt(req.params.id);
    if (isNaN(roomId)) return res.status(400).json({ error: "Invalid room ID" });

    const [room] = await db.select().from(groupRooms).where(eq(groupRooms.id, roomId)).limit(1);
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.creatorId !== user.id) return res.status(403).json({ error: "Only the room creator can delete this room" });

    // Cascade-delete members and votes first, then the room
    await db.delete(votes).where(eq(votes.roomId, roomId));
    await db.delete(groupMembers).where(eq(groupMembers.roomId, roomId));
    await db.delete(groupRooms).where(eq(groupRooms.id, roomId));

    return res.status(200).json({ message: "Group room deleted successfully" });
  } catch (err) {
    console.error("Delete group room error:", err);
    return res.status(500).json({ error: "Internal server error deleting group room" });
  }
};

// GET GROUP MESSAGES
export const getGroupMessages = async (req: Request, res: Response) => {
  try {
    const roomId = parseInt(req.params.id);
    if (isNaN(roomId)) return res.status(400).json({ error: "Invalid room ID" });
    const msgs = await db
      .select({
        id: groupMessages.id,
        message: groupMessages.message,
        createdAt: groupMessages.createdAt,
        userId: groupMessages.userId,
        userFullName: users.fullName,
        userProfilePic: users.profilePic,
      })
      .from(groupMessages)
      .innerJoin(users, eq(groupMessages.userId, users.id))
      .where(eq(groupMessages.roomId, roomId))
      .orderBy(asc(groupMessages.createdAt))
      .limit(100);
    return res.json({ messages: msgs });
  } catch (err) {
    console.error("Get group messages error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// SEND GROUP MESSAGE
export const sendGroupMessage = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const roomId = parseInt(req.params.id);
    const { message } = req.body;
    if (isNaN(roomId)) return res.status(400).json({ error: "Invalid room ID" });
    if (!message?.trim()) return res.status(400).json({ error: "Message cannot be empty" });

    const [msg] = await db.insert(groupMessages).values({
      roomId, userId: user.id, message: message.trim(),
    }).returning();
    return res.status(201).json({
      message: { ...msg, userFullName: user.fullName, userProfilePic: user.profilePic },
    });
  } catch (err) {
    console.error("Send group message error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// REJECT MOVIE SUGGESTION (vote to reject)
export const rejectMovieSuggestion = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const roomId = parseInt(req.params.id);
    const { movieId } = req.body;
    if (isNaN(roomId) || !movieId) return res.status(400).json({ error: "roomId and movieId required" });

    await db.delete(votes).where(
      and(eq(votes.roomId, roomId), eq(votes.userId, user.id), eq(votes.voteType, "reject_movie"))
    );
    await db.insert(votes).values({ roomId, userId: user.id, voteType: "reject_movie", votedId: parseInt(movieId) });
    return res.json({ success: true });
  } catch (err) {
    console.error("Reject movie error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET NEW MOVIE RECOMMENDATION (excludes rejected & already voted movies)
export const getNewMovieRecommendation = async (req: Request, res: Response) => {
  try {
    const roomId = parseInt(req.params.id);
    if (isNaN(roomId)) return res.status(400).json({ error: "Invalid room ID" });

    const rejectVotes = await db.select({ votedId: votes.votedId })
      .from(votes)
      .where(and(eq(votes.roomId, roomId), eq(votes.voteType, "reject_movie")));
    const rejectedIds = [...new Set(rejectVotes.map((v) => v.votedId))];

    const currentVotes = await db.select({ votedId: votes.votedId })
      .from(votes)
      .where(and(eq(votes.roomId, roomId), eq(votes.voteType, "movie")));
    const votedIds = [...new Set(currentVotes.map((v) => v.votedId))];

    const excluded = [...new Set([...rejectedIds, ...votedIds])];

    const allNowShowing = await db.select().from(movies)
      .where(and(eq(movies.isNowShowing, true), eq(movies.isActive, true)));

    const candidates = allNowShowing.filter((m) => !excluded.includes(m.id));
    const pool = candidates.length > 0 ? candidates : allNowShowing.filter((m) => !rejectedIds.includes(m.id));
    const sorted = [...pool].sort((a, b) => (b.topRated ? 1 : 0) - (a.topRated ? 1 : 0));

    return res.json({ movie: sorted[0] || null });
  } catch (err) {
    console.error("Get recommendation error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET MY GROUP ROOMS
export const getMyGroupRooms = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
 
    const memberRooms = await db.select().from(groupMembers).where(eq(groupMembers.userId, user.id));
    const rIds = memberRooms.map((m) => m.roomId);
 
    const allRooms = await db.select().from(groupRooms);
    const filteredRooms = allRooms.filter((r) => rIds.includes(r.id));
 
    const list = await Promise.all(
      filteredRooms.map(async (r) => {
        const creator = await db.select().from(users).where(eq(users.id, r.creatorId)).limit(1);
        const membersCount = (await db.select().from(groupMembers).where(eq(groupMembers.roomId, r.id))).length;
        let movie: typeof movies.$inferSelect | null = null;
        if (r.selectedMovieId) {
          const dbMovie = await db.select().from(movies).where(eq(movies.id, r.selectedMovieId)).limit(1);
          movie = dbMovie[0] || null;
        }
        return {
          ...r,
          creator: creator[0] ? { id: creator[0].id, fullName: creator[0].fullName } : null,
          membersCount,
          movie,
        };
      })
    );
 
    return res.status(200).json({ rooms: list });
  } catch (err) {
    console.error("Fetch my group rooms error:", err);
    return res.status(500).json({ error: "Internal server error fetching group rooms" });
  }
};