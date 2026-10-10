import mongoose from "mongoose";

const { Schema, model } = mongoose;
const id = () => new mongoose.Types.ObjectId().toString();
const opts = {
    versionKey: false,
    id: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
};
const make = (name, fields, options = {}) => {
    const { indexes = [], ...schemaOptions } = options;
    const schema = new Schema(
        { _id: { type: String, default: id }, ...fields },
        { ...opts, ...schemaOptions },
    );
    for (const [keys, options] of indexes) schema.index(keys, options);
    const exposeId = (doc) =>
        doc && Object.assign(doc, { id: String(doc._id) });
    schema.post("find", (docs) => docs.forEach(exposeId));
    schema.post("findOne", exposeId);
    schema.post("findOneAndUpdate", exposeId);
    return model(name, schema);
};

export const User = make("User", {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    bio: String,
    photoUrl: String,
    createdAt: { type: Date, default: Date.now },
});
export const RunnerPreference = make("RunnerPreference", {
    userId: { type: String, unique: true, index: true },
    level: { type: String, default: "BEGINNER" },
    preferredDistanceKm: { type: Number, default: 5 },
    preferredTime: String,
    paceSecPerKm: Number,
    environment: { type: String, default: "MIXED" },
    openToGroupRuns: { type: Boolean, default: true },
});
export const Location = make(
    "Location",
    { label: String, lat: Number, lng: Number, area: String, userId: String },
    { indexes: [[{ lat: 1, lng: 1 }]] },
);
export const Route = make("Route", {
    type: { type: String, default: "LOOP" },
    distanceM: Number,
    difficulty: { type: String, default: "EASY" },
    geometry: Schema.Types.Mixed,
    startId: String,
    createdAt: { type: Date, default: Date.now },
});
export const Run = make(
    "Run",
    {
        title: String,
        description: String,
        hostId: String,
        routeId: String,
        meetingPointId: String,
        clubId: String,
        scheduledAt: Date,
        status: { type: String, default: "PLANNED" },
        visibility: { type: String, default: "PRIVATE" },
        startedAt: Date,
        completedAt: Date,
        durationSec: Number,
        distanceM: Number,
        createdAt: { type: Date, default: Date.now },
    },
    {
        indexes: [
            [{ scheduledAt: 1 }],
            [{ status: 1, visibility: 1, scheduledAt: 1 }],
        ],
    },
);
export const RunParticipant = make(
    "RunParticipant",
    {
        runId: { type: String, index: true },
        userId: { type: String, index: true },
        joinedAt: { type: Date, default: Date.now },
        matchScore: Number,
        matchReason: String,
        status: { type: String, default: "JOINED" },
        startedAt: Date,
        completedAt: Date,
        durationSec: Number,
        distanceM: Number,
        distanceSource: String,
    },
    { indexes: [[{ runId: 1, userId: 1 }, { unique: true }]] },
);
export const RunAvailability = make(
    "RunAvailability",
    {
        userId: { type: String, index: true },
        date: Date,
        time: String,
        distanceKm: Number,
        locationId: String,
    },
    { indexes: [[{ date: 1, time: 1 }]] },
);
export const RunReflection = make("RunReflection", {
    runId: { type: String, index: true },
    userId: { type: String, index: true },
    text: String,
    aiSummary: Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now },
});
export const RunClub = make("RunClub", {
    name: String,
    description: String,
    ownerId: String,
    createdAt: { type: Date, default: Date.now },
});
export const ClubMember = make(
    "ClubMember",
    {
        clubId: { type: String, index: true },
        userId: { type: String, index: true },
        role: { type: String, default: "MEMBER" },
    },
    { indexes: [[{ clubId: 1, userId: 1 }, { unique: true }]] },
);
export const Follow = make(
    "Follow",
    {
        followerId: { type: String, index: true },
        followingId: { type: String, index: true },
    },
    { indexes: [[{ followerId: 1, followingId: 1 }, { unique: true }]] },
);
export const Kudos = make(
    "Kudos",
    {
        runId: { type: String, index: true },
        userId: { type: String, index: true },
    },
    { indexes: [[{ runId: 1, userId: 1 }, { unique: true }]] },
);
export const Comment = make("Comment", {
    runId: { type: String, index: true },
    userId: { type: String, index: true },
    body: String,
    createdAt: { type: Date, default: Date.now },
});
