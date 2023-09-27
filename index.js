const express = require("express");
const cors = require("cors");
const app = express();
const mime = require("mime-types");
const multer = require("multer");
const stream = require("stream");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const storage = multer.memoryStorage(); // Store file in memory (can also use diskStorage)
const upload = multer({ storage: storage });
// app.use(uploadRouter);

require("dotenv").config();

const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");
const apiKeys = require("./apikeys.json");

const SCOPE = ["https://www.googleapis.com/auth/drive"];
// A Function that can provide access to google drive api
async function authorize() {
  const jwtClient = new google.auth.JWT(
    apiKeys.client_email,
    null,
    apiKeys.private_key,
    SCOPE
  );

  await jwtClient.authorize();
  return jwtClient;
}
// A Function that will upload the desired file to google drive folder

const no = 1;
// async function uploadFile(authClient) {
//   return new Promise((resolve, rejected) => {
//     console.log("Asci");
//     console.log(no);
//     const drive = google.drive({ version: "v3", auth: authClient });

//     var fileMetaData = {
//       name: "mydrivetext.txt",
//       parents: ["1xfk1StJ2AscqxDDoLwNj3tPRUS_dLpw5"], // A folder ID to which file will get uploaded
//     };
//     drive.files.create(
//       {
//         resource: fileMetaData,
//         media: {
//           body: fs.createReadStream("mydrivetext.txt"), // files that will get uploaded
//           mimeType: "text/plain",
//         },
//         fields: "id",
//       },
//       function (error, file) {
//         if (error) {
//           console.log("error");
//           return rejected(error);
//         }
//         resolve(file);
//       }
//     );
//   });
// }
// authorize()
//   .then(uploadFile)
//   .then((res) => {
//     // console.log(res);
//   })
//   .catch((err) => {
//     console.log(err);
//   });

// const CLIENT_ID =
//   "725149149598-vs93d7ts9v4f2vk3kl2s2mqucpc75rgi.apps.googleusercontent.com";
// const CLIENT_SECRET = "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";
// const REDIRECT_URI = "https://developers.google.com/oauthplayground";
// const REFRESH_TOKEN =
//   "1//04ieUxrHMKbp_CgYIARAAGAQSNwF-L9IrxuQw2g6wjr5VN9TMTk-qoUZDqibJST3UwaILhDUTro1nqLzNShCcwXZPmIWZw4MZ4h0";

// const oauth2Client = new google.auth.OAuth2(
//   CLIENT_ID,
//   CLIENT_SECRET,
//   REDIRECT_URI
// );

// oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

// const drive = google.drive({
//   version: "v3",
//   auth: oauth2Client,
// });

const filePath = path.join(__dirname, "example.png");

console.log(mime.contentType("example.DWG"));

// async function uploadFile() {
//   try {
//     const response = await drive.files.create({
//       requestBody: {
//         name: "example.png", //This can be name of your choice
//         mimeType: "image/png",
//       },
//       media: {
//         mimeType: "image/png",
//         body: fs.createReadStream(filePath),
//       },
//     });

//     console.log(response.data);
//   } catch (error) {
//     console.log(error.message);
//   }
// }

// uploadFile();

const uploadFile = async (authClient, fileObject, folderId) => {
  const bufferStream = new stream.PassThrough();

  console.log(fileObject, "FILE OBJECT");
  // console.log(bufferStream, "BufferStream");
  bufferStream.end(fileObject.buffer);

  const { data } = await google
    .drive({ version: "v3", auth: authClient })
    .files.create({
      media: {
        mimeType: fileObject.mimeType,
        body: bufferStream,
      },
      requestBody: {
        name: fileObject.originalname,
        parents: [folderId],
      },
      fields: "id,name",
    });
  console.log(`Uploaded file ${data.name} ${data.id}`);

  return data.id;
};

const deleteGoggleDriveFile = async (authClient, fileId) => {
  const drive = google.drive({ version: "v3", auth: authClient }); // Authenticating drive API

  // Deleting the image from Drive
  drive.files.delete({
    fileId: fileId,
  });
};

const deletePreviousFile = (oldData, newData) => {
  let fileIdArr = [];

  console.log(oldData, "OldData");
  console.log(newData, "NEW DATA");

  if (newData.documents) {
    fileIdArr = [...oldData.documents];
  }
  if (newData.drawing) {
    console.log(oldData.drawing, "OLD DATA");
    const extractOldData = oldData.drawing;

    fileIdArr = Object.values(extractOldData);
  }
  // if (newData.payment) {
  //   const extractOldData = oldData.payment;
  // }

  fileIdArr.length &&
    fileIdArr.forEach((fileId) => {
      authorize().then((authClient) =>
        deleteGoggleDriveFile(authClient, fileId)
      );
    });
};

const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log("Server is running on port ", port);
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.iidrxjp.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  // All collections
  const userCollection = client
    .db("Construction-Application")
    .collection("users");

  const submitApplicationCollection = client
    .db("Construction-Application")
    .collection("submitApplication");

  // get users data
  app.get("/getUser", async (req, res) => {
    const id = req.query.id;
    console.log(id);

    const result = await userCollection.findOne({ userId: id });

    console.log(result);
    const { _id, role, userId, password, name } = result;

    if (result) {
      res.send({
        status: 1,
        userInfo: { _id, role, userId, password, name },
      });
    } else {
      res.send({
        status: 0,
      });
    }
  });

  // get all users
  app.get("/allUser", async (req, res) => {
    const cursor = userCollection.find({});
    const result = await cursor.toArray();
    res.send(result);
  });

  //get users draftapplication
  app.get("/draftApplications/:id", async (req, res) => {
    const id = req.params.id;
    console.log(id);

    const { draftApplication } = await userCollection.findOne({
      _id: new ObjectId(id),
    });

    res.send(draftApplication);
  });

  // get specific applicationNo data
  app.get("/getApplicationData", async (req, res) => {
    const { appNo, userId } = JSON.parse(req.query.data);
    console.log(req.query.data);

    console.log(appNo, userId);

    const result = await userCollection
      .aggregate([
        {
          $match: {
            _id: new ObjectId(userId),
            "draftApplication.applicationNo": appNo,
          },
        },
        {
          $project: {
            draftApplication: {
              $filter: {
                input: "$draftApplication",
                as: "app",
                cond: {
                  $eq: ["$$app.applicationNo", appNo],
                },
              },
            },
          },
        },
      ])
      .toArray();

    const draftApplicationData = result[0]?.draftApplication[0];

    console.log(draftApplicationData);
    res.send(draftApplicationData);
  });

  // get all submit application data
  app.get("/allSubmitApplications", async (req, res) => {
    const userId = req.query.id;
    console.log(userId);

    const result = await submitApplicationCollection.find({ userId }).toArray();

    console.log(result);
    res.send(result);
  });

  // store user data
  app.post("/addUser", async (req, res) => {
    const userInfo = req.body;

    console.log(userInfo);

    const findSameIdPerson = await userCollection.findOne({
      userId: userInfo.userId,
    });
    console.log(findSameIdPerson);

    if (findSameIdPerson) {
      res.send({
        result: 0,
        message: "User id already exist",
      });
    } else {
      const result = await userCollection.insertOne(userInfo);
      res.send(result);
    }
  });

  app.post("/upload", upload.array("files"), async (req, res) => {
    // Access uploaded file via req.file

    const pages = {
      document: "1xfk1StJ2AscqxDDoLwNj3tPRUS_dLpw5",
      drawing: "1wRElw-4faLOZWQjV4dzcQ2lHG-IhMhQd",
      payment: "1pWE9tZrfsjiZxNORP5ZwL7Bm72S7JKpY",
    };

    console.log("Aschi");
    const file = req.files;

    const page = req.query.page;

    const folderId = pages[page];

    console.log(folderId);

    // console.log(file);
    if (!file) {
      return res.status(400).send({ msg: "No file uploaded." });
    }

    const uploadFileId = [];
    let promises = [];

    for (let f = 0; f < file.length; f += 1) {
      promises.push(
        authorize()
          .then((authClient) => uploadFile(authClient, file[f], folderId))
          .then((res) => {
            console.log(res, "RESPONSE");
            uploadFileId.push(res);
          })
          .catch((err) => {
            console.log(err);
            res.send({ msg: "Something went wrong" });
          })
      );

      // console.log(uploadFileId, "UPLOADFILEID");
    }
    // Use Promise.all to wait for all promises to resolve
    Promise.all(promises)
      .then(() => {
        // Handle the file, save it to disk, or perform other processing
        console.log("All uploads completed");
        console.log(uploadFileId, "UPLOADFILEID");
        res.send({ msg: "Successfully uploaded", fileId: uploadFileId });
      })
      .catch((error) => {
        res.send({ msg: "An error occurred during uploads" });
      });
  });

  // update user draft application  data
  app.patch("/updateDraftApplicationData/:id", async (req, res) => {
    const userId = req.params.id;
    const newDraftData = req.body;

    console.log(userId, "USERID", "NEW DRAFT", newDraftData);

    const filter = { _id: new ObjectId(userId) };

    const { draftApplication: oldDraftData } = await userCollection.findOne(
      filter
    );

    console.log(oldDraftData, "OLD DRAFT MAIN");

    // console.log(oldDraftData, "Old draft data");

    const findExistingData = oldDraftData.findIndex(
      (application) => application.applicationNo === newDraftData.applicationNo
    );

    console.log(findExistingData, "findExistingData");

    if (findExistingData === -1) {
      oldDraftData.push(newDraftData);
    } else {
      if (
        newDraftData.documents ||
        newDraftData.drawing ||
        newDraftData.payment
      ) {
        deletePreviousFile(oldDraftData[findExistingData], newDraftData);
      }
      oldDraftData[findExistingData] = {
        ...oldDraftData[findExistingData],
        ...newDraftData,
      };
    }

    const updateDoc = {
      $set: {
        draftApplication: oldDraftData,
      },
    };

    // console.log(oldDraftData[findExistingData]);
    // console.log(newDraftData);

    const result = await userCollection.updateOne(filter, updateDoc);

    res.send(result);
  });

  // update user information
  app.patch("/updateUserInfo/:id", async (req, res) => {
    const id = req.params.id;
    const { name, userId, password, role } = req.body;

    console.log(id);

    const filter = { _id: new ObjectId(id) };

    const updateDoc = {
      $set: {
        name,
        userId,
        password,
        role,
      },
    };

    const result = await userCollection.updateOne(filter, updateDoc);

    res.send(result);
  });

  // delete an individual user
  app.delete("/deleteUser/:id", async (req, res) => {
    const userId = req.params.id;
    console.log(userId);

    const query = { _id: new ObjectId(userId) };

    const result = await userCollection.deleteOne(query);

    res.send(result);
  });

  // delete specific draft application
  app.delete("/deleteSingleDraft", async (req, res) => {
    const { applicationNo, userID } = req.body;

    console.log(applicationNo, userID);

    // const userInfo = await userCollection.findOne({ _id: ObjectId(userID) });

    const result = await userCollection.updateOne(
      { _id: new ObjectId(`${userID}`) },
      { $pull: { draftApplication: { applicationNo } } }
    );
    console.log(result);
    res.send(result);
  });

  // delete specific application information. This is used for sending data into the department. At first the desired application data will be removed from the draft application data and stored in the submit application collection
  app.delete("/deleteApplication", async (req, res) => {
    const data = JSON.parse(req.query.data);
    console.log("Data:", data);

    const { userId, applicationNo } = data;

    console.log(userId, "UserId");

    const findApplicant = await userCollection.findOne({
      _id: new ObjectId(userId),
    });

    const searchApplicationData = findApplicant?.draftApplication.find(
      (application) => application.applicationNo === applicationNo
    );

    console.log(searchApplicationData);

    const date = new Date();

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    const submitDate = `${day}-${month}-${year}`;

    const resultOfInsertData = await submitApplicationCollection.insertOne({
      ...searchApplicationData,
      userId,
      submitDate,
      status: "Pending at PS",
    });

    const resultOfDeleteData = await userCollection.updateOne(
      { _id: new ObjectId(`${userId}`) },
      { $pull: { draftApplication: { applicationNo } } }
    );

    console.log(resultOfDeleteData);

    res.send(resultOfDeleteData);
  });
}

run().catch(console.dir);

// Export the Express API
module.exports = app;
