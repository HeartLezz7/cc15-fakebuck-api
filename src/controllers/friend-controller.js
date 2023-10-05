const { STATUS_PENDING, STATUS_ACCEPTED } = require("../config/constants");
const prisma = require("../models/prisma");
const createError = require("../utils/create-error");
const {
  checkReceiverIdSchema,
  checkRequesterIdSchema,
} = require("../validators/user-validatior");

exports.requestFriend = async (req, res, next) => {
  try {
    const { error, value } = checkReceiverIdSchema.validate(req.params);
    if (error) {
      return next(error);
    }

    if (value.receiverId === req.user.id) {
      return next(createError("cannot request yourself", 400));
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: value.receiverId },
    });

    if (!targetUser) {
      return next(createError("user does not exist", 400));
    }

    const existRelationship = await prisma.friend.findFirst({
      where: {
        OR: [
          { requesterId: req.user.id, receiverId: value.receiverId },
          { requesterId: value.receiverId, receiverId: req.user.id },
        ],
      },
    });

    if (existRelationship) {
      return next(createError("user already has relationship", 400));
    }

    await prisma.friend.create({
      data: {
        requesterId: req.user.id,
        receiverId: value.receiverId,
        status: STATUS_PENDING,
      },
    });

    res.status(201).json({ message: "request has been sent" });
  } catch (err) {
    next(err);
  }
};

exports.acceptRequest = async (req, res, next) => {
  try {
    const { error, value } = checkRequesterIdSchema.validate(req.params);
    if (error) {
      return next(error);
    }

    const existRelationship = await prisma.friend.findFirst({
      where: {
        requesterId: value.requesterId,
        receiverId: req.user.id,
        status: STATUS_PENDING,
      },
    });

    if (!existRelationship) {
      return next(createError("relationship does not exist", 400));
    }

    await prisma.friend.update({
      data: { status: STATUS_ACCEPTED },
      where: { id: existRelationship.id },
    });

    res.status(200).json({ message: "friend request has been ACCEPTED" });
  } catch (err) {
    console.log(err);
  }
};
