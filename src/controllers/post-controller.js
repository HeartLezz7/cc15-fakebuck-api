const createError = require("../utils/create-error");
const { upload } = require("../utils/cloudinary-service");
const prisma = require("../models/prisma");
const fs = require("fs/promises");
const { STATUS_ACCEPTED } = require("../config/constants");

const getFriendIds = async (targetUserId) => {
  const relationship = await prisma.friend.findMany({
    where: {
      OR: [{ receiverId: targetUserId }, { requesterId: targetUserId }],
      status: STATUS_ACCEPTED,
    },
  });

  const friendIds = relationship.map((item) =>
    item.requesterId === targetUserId ? item.receiverId : item.requesterId
  );
  return friendIds;
};

exports.createPost = async (req, res, next) => {
  try {
    const { message } = req.body;
    if ((!message || !message.trim()) && !req.file) {
      return next(createError("message or image is required", 400));
    }
    const data = { userId: req.user.id };
    if (req.file) {
      data.image = await upload(req.file.path);
    }
    if (message) {
      data.message = message;
    }

    await prisma.post.create({ data: data });
    res.status(200).json({ message: "post SUCCESS" });
  } catch (err) {
    next(err);
  } finally {
    if (req.file) {
      fs.unlink(req.file.path);
    }
  }
};

exports.getAllPostIncludeFriendPost = async (req, res, next) => {
  try {
    const friendIds = await getFriendIds(req.user.id);
    console.log(friendIds);
    const posts = await prisma.post.findMany({
      where: {
        userId: {
          in: [...friendIds, req.user.id],
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
      },
    });
    res.status(200).json({ posts });
  } catch (err) {
    next(err);
  } finally {
    if (req.file) {
      fs.unlink(req.file.path);
    }
  }
};
