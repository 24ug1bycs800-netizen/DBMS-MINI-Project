# CineCircle 🎬

## Mini Project Overview

CineCircle is a full-stack movie ticket booking web application developed as a mini project. The system allows users to browse movies, select showtimes, choose seats, book tickets, manage bookings, and collaborate with friends through the Movie Nights feature — a group movie planning experience with AI-assisted recommendations and real-time squad chat.

The project demonstrates modern web development practices including database design, JWT authentication, online payment integration, and collaborative features.

---

## Objectives

* Provide an online movie ticket booking platform.
* Allow users to browse movies and show schedules.
* Enable interactive seat selection with temporary seat locking.
* Support secure user authentication with JWT.
* Generate digital tickets with QR codes.
* Facilitate collaborative movie planning through Movie Nights with group chat.

---

## Features

### User Features

* User Registration and Login (JWT-based)
* Browse Movies and Show Details
* Interactive Seat Selection with 5-minute Seat Locking
* Wishlist Management
* Movie Reviews and Ratings
* Ticket Booking and Cancellation
* QR Code Based Tickets
* PDF Ticket Generation
* Booking History Dashboard
* Push Notifications

### Movie Nights (Group Planning)

* Create a Movie Night and invite friends via invite code
* Submit individual preferences (genre, time, budget, location)
* AI-assisted movie recommendation using weighted scoring algorithm
* Group voting on recommendations
* Coordinated seat booking for all members
* Split contribution tracking and payment status
* Real-time Squad Chat between group members (5s polling)

### Admin Features

* Add and Manage Movies (with TMDB sync support)
* Manage Shows, Screens, and Theatres
* View Booking Information

### Payment Features

* Razorpay Payment Integration
* HMAC-SHA256 signature verification
* Booking Confirmation after Payment
* Payment Tracking per booking

---

## Technology Stack

### Frontend

* React 19 + TypeScript
* Vite
* Tailwind CSS
* Zustand (global state — city selection)
* Lucide React (icons)

### Backend

* Node.js + Express.js
* Drizzle ORM (type-safe SQL queries)
* JWT Authentication (access token 1d, refresh token 7d)
* Razorpay SDK

### Database

* PostgreSQL

---

## Database Tables

* users
* cities
* movies
* theatres
* screens
* seats
* shows
* bookings
* booking\_seats
* payments
* reviews
* wishlist
* seat\_locks
* notifications
* movie\_nights
* movie\_night\_members
* movie\_night\_preferences
* movie\_night\_recommendations
* movie\_night\_votes
* movie\_night\_contributions
* movie\_night\_messages

---

## Movie Night Recommendation Algorithm

Preferences from all members are aggregated and scored using a weighted formula:

| Factor  | Weight |
|---------|--------|
| Genre   | 40%    |
| Time    | 30%    |
| Budget  | 20%    |
| Location| 10%    |

Movies are ranked against these aggregated preferences to surface the best match for the group.

---

## System Workflow

```
User Login
↓
Browse Movies
↓
Select Show
↓
Choose Seats (5-min lock)
↓
Make Payment (Razorpay)
↓
Booking Confirmation
↓
QR Ticket Generation
↓
Dashboard

── OR ──

Create Movie Night
↓
Invite Friends (invite code)
↓
Submit Preferences
↓
Generate Recommendation
↓
Vote on Movie
↓
Book Seats for All Members
↓
Squad Chat
```

---

## Future Enhancements

* WebSocket-based real-time chat (replace polling)
* Email ticket delivery
* Mobile application support
* Advanced analytics dashboard
* TMDB auto-sync for new releases

---

## Conclusion

CineCircle demonstrates the implementation of a modern movie ticket booking system featuring seat reservation with concurrency control, Razorpay payment integration, digital QR ticket generation, and a collaborative Movie Nights feature with group recommendations, voting, and real-time squad chat. The project integrates frontend, backend, and database technologies into a complete full-stack web application.

---

## Developed By

Kaniska Raj — 1BY24CS122  
Shashikala T — 1TD24CS263  
Sinchana S R — 1TD24CS276  
Ananya Priyadarshini — 1BY24CS018  

Mini Project Submission  
Department of Computer Science  
Academic Year 2025–26
