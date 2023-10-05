const createError = require("../utils/create-error");
const { upload } = require("../utils/cloudinary-service");
const prisma = require("../models/prisma");
const fs = require("fs/promises");
const { checkUserIdSchema } = require("../validators/user-validatior");
const {
  AUTH_USER,
  UNKNOWN,
  STATUS_ACCEPTED,
  FRIEND,
  REQUESTER,
  RECEIVER,
} = require("../config/constants");

const getTargetUserStatusWithAuthUser = async (targetUserId, authUserId) => {
  if (targetUserId == authUserId) {
    return AUTH_USER;
  }
  const relationship = await prisma.friend.findFirst({
    where: {
      OR: [
        { requesterId: targetUserId, receiverId: authUserId },
        { requesterId: authUserId, receiverId: targetUserId },
      ],
    },
  });

  if (!relationship) {
    return UNKNOWN;
  }

  if (relationship.status === STATUS_ACCEPTED) {
    return FRIEND;
  }

  if (relationship.requesterId === authUserId) {
    return REQUESTER;
  }

  return RECEIVER;
};

const getTargetUserFriends = async (targetUserId) => {
  const relationship = await prisma.friend.findMany({
    where: {
      status: STATUS_ACCEPTED,
      OR: [{ requesterId: targetUserId }, { receiverId: targetUserId }],
    },
    select: {
      requester: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          mobile: true,
          profileImage: true,
          coverImage: true,
        },
      },
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          mobile: true,
          profileImage: true,
          coverImage: true,
        },
      },
    },
  });
  // console.log(relationship);

  const friends = relationship.map((item) =>
    item.requester.id == targetUserId ? item.receiver : item.requester
  );
  return friends;
};

exports.updateProfile = async (req, res, next) => {
  try {
    if (!req.files) {
      return next(createError("profile image or cover image is required"));
    }

    const response = {};

    if (req.files.profileImage) {
      const url = await upload(req.files.profileImage[0].path);
      response.profileImage = url;
      await prisma.user.update({
        data: { profileImage: url },
        where: { id: req.user.id },
      });
    }

    if (req.files.coverImage) {
      const url = await upload(req.files.coverImage[0].path);
      response.coverImage = url;
      await prisma.user.update({
        data: { coverImage: url },
        where: { id: req.user.id },
      });
    }
    res.status(200).json(response);
  } catch (err) {
    console.log(err);
  } finally {
    if (req.files.profileImage) {
      fs.unlink(req.files.profileImage[0].path);
    }
    if (req.files.coverImage) {
      fs.unlink(req.files.coverImage[0].path);
    }
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const { error } = checkUserIdSchema.validate(req.params);
    if (error) {
      return next(error);
    }
    const userId = +req.params.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    let status = null;
    let friends = null;

    if (user) {
      delete user.password;
      status = await getTargetUserStatusWithAuthUser(userId, req.user.id);
      friends = await getTargetUserFriends(userId);
    }

    res.status(200).json({ user, status, friends });
  } catch (err) {
    next(err);
  }
};
