exports.updateProfile = async (req, res, next) => {
  try {
    res.status(200).json({ message: "SUCCESS" });
  } catch (err) {
    console.log(err);
  }
};
