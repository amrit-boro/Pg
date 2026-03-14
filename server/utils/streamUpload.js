const streamifier = require("streamifier");
const { cloudinary } = require("./cloudinary");

// const streamUpload = (buffer) => {
//   return new Promise((resolve, reject) => {
//     const stream = cloudinary.uploader.upload_stream(
//       { folder: "test_folder", resource_type: "video" },
//       (error, result) => {
//         if (result) resolve(result);
//         else reject(error);
//       },
//     );

//     streamifier.createReadStream(buffer).pipe(stream);
//   });
// };

// new
const streamUpload = (buffer, type) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "test_folder",
        resource_type: type,
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      },
    );
    require("streamifier").createReadStream(buffer).pipe(stream);
  });
};

module.exports = streamUpload;
