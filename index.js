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

  console.log("ASLAM");

  console.log(oldData, "OldData");
  console.log(newData, "NEW DATA");

  if (newData.documents) {
    const extractOldData = Object.values(oldData.documents);
    const extractNewData = Object.values(newData.documents);

    console.log(extractOldData, "Document OLD");
    console.log(extractNewData, "DOCUMENT NEW");

    fileIdArr = extractOldData.filter(
      (old, index) => old !== extractNewData[index]
    );

    console.log(fileIdArr, "DOCUMENT FILE ID ARR");
  }

  if (newData.drawing) {
    console.log(oldData.drawing, "OLD DATA");
    const extractOldData = Object.values(oldData.drawing);
    const extractNewData = Object.values(newData.drawing);

    fileIdArr = extractOldData.filter(
      (old, index) => old !== extractNewData[index]
    );

    console.log(fileIdArr, "DELETE FILE ID OF DRAWING");
  }

  // FOR PAYMENT OLD IMAGE FILES
  if (newData.payment) {
    const oldDGramaFee =
      oldData?.payment?.gramaPanchayatFee?.gramaBankReceipt ?? "";
    const oldLabourCharge =
      oldData?.payment?.labourCessCharge?.labourCessBankReceipt ?? "";
    const oldGreenFee =
      oldData?.payment?.greenFeeCharge?.greenFeeBankReceipt ?? "";

    if (
      newData?.payment?.gramaPanchayatFee?.gramaBankReceipt !== oldDGramaFee
    ) {
      fileIdArr.push(oldDGramaFee);
    }
    if (
      newData?.payment?.labourCessCharge?.labourCessBankReceipt !==
      oldLabourCharge
    ) {
      fileIdArr.push(oldLabourCharge);
    }
    if (newData?.payment?.greenFeeCharge?.greenFeeBankReceipt !== oldGreenFee) {
      fileIdArr.push(oldGreenFee);
    }

    console.log(fileIdArr, "PAYMENT");
  }

  fileIdArr.length &&
    fileIdArr.forEach((fileId) => {
      if (fileId.length) {
        authorize().then((authClient) =>
          deleteGoggleDriveFile(authClient, fileId)
        );
      }
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

  const documentPageCollection = client
    .db("Construction-Application")
    .collection("DocumentPage");

  const draftApplicationCollection = client
    .db("Construction-Application")
    .collection("draftApplications");

  app.get("/documents", async (req, res) => {
    const result = await documentPageCollection.find({}).toArray();
    res.send(result);
  });
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

    const result = await draftApplicationCollection
      .find({
        userId: id,
      })
      .toArray();

    res.send(result);
  });

  // get specific applicationNo data
  app.get("/getApplicationData", async (req, res) => {
    const { appNo, userId, role } = JSON.parse(req.query.data);
    console.log(req.query.data);

    console.log(appNo, userId);

    let result;
    if (role === "PS") {
      result = await submitApplicationCollection.findOne({
        applicationNo: appNo,
      });
    } else if (role === "LTP") {
      result = await draftApplicationCollection.findOne({
        userId,
        applicationNo: appNo,
      });
    }

    // const result = await userCollection
    //   .aggregate([
    //     {
    //       $match: {
    //         _id: new ObjectId(userId),
    //         "draftApplication.applicationNo": appNo,
    //       },
    //     },
    //     {
    //       $project: {
    //         draftApplication: {
    //           $filter: {
    //             input: "$draftApplication",
    //             as: "app",
    //             cond: {
    //               $eq: ["$$app.applicationNo", appNo],
    //             },
    //           },
    //         },
    //       },
    //     },
    //   ])
    //   .toArray();

    // const draftApplicationData = result[0]?.draftApplication[0];

    console.log(result);
    res.send(result);
  });

  //get all draft application data
  app.get("/allDraftApplicationData", async (req, res) => {
    const result = await draftApplicationCollection.find({}).toArray();
    res.send(result);
  });

  // get specific applicationNo data
  // app.get("/getApplicationData", async (req, res) => {
  //   const { appNo, userId } = JSON.parse(req.query.data);
  //   console.log(req.query.data);

  //   console.log(appNo, userId);

  //   const filter = { userId, applicationNo: appNo };

  //   console.log(filter);

  //   const result = await draftApplicationCollection.findOne(filter);

  //   // const result = await userCollection
  //   //   .aggregate([
  //   //     {
  //   //       $match: {
  //   //         _id: new ObjectId(userId),
  //   //         "draftApplication.applicationNo": appNo,
  //   //       },
  //   //     },
  //   //     {
  //   //       $project: {
  //   //         draftApplication: {
  //   //           $filter: {
  //   //             input: "$draftApplication",
  //   //             as: "app",
  //   //             cond: {
  //   //               $eq: ["$$app.applicationNo", appNo],
  //   //             },
  //   //           },
  //   //         },
  //   //       },
  //   //     },
  //   //   ])
  //   //   .toArray();

  //   // const draftApplicationData = result[0]?.draftApplication[0];

  //   console.log(result);
  //   res.send(result);
  // });

  // get all submit application data
  app.get("/allSubmitApplications", async (req, res) => {
    const userId = req.query.id;
    console.log(userId);

    const result = await submitApplicationCollection.find({ userId }).toArray();

    console.log(result);
    res.send(result);
  });

  // get all submit application data for PS
  app.get("/submitApplications", async (req, res) => {
    const result = await submitApplicationCollection.find({}).toArray();
    res.send(result);
  });

  // get data from the submit application
  app.get("/getSubmitDataOfPs", async (req, res) => {
    const { appNo } = JSON.parse(req.query.appNo);

    console.log(appNo, "APPLICATION NO");

    const result = await submitApplicationCollection.findOne({
      applicationNo: appNo,
    });

    console.log(result, "Find");
    res.send(result);
  });

  // Store draft application in the database
  app.post("/addApplication", async (req, res) => {
    const data = req.body;
    console.log(data);
    const result = await draftApplicationCollection.insertOne(data);
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

  app.post("/upload", upload.single("file"), async (req, res) => {
    // Access uploaded file via req.file

    const pages = {
      document: "1xfk1StJ2AscqxDDoLwNj3tPRUS_dLpw5",
      drawing: "1wRElw-4faLOZWQjV4dzcQ2lHG-IhMhQd",
      payment: "1pWE9tZrfsjiZxNORP5ZwL7Bm72S7JKpY",
    };

    console.log("Aschi");
    const file = req.file;

    const page = req.query.page;

    const folderId = pages[page];

    console.log(folderId, file, page);

    // console.log(file);
    if (!file) {
      return res.status(400).send({ msg: "No file uploaded." });
    }

    authorize()
      .then((authClient) => uploadFile(authClient, file, folderId))
      .then((result) => {
        console.log(result, "RESPONSE");
        res.send({ msg: "Successfully uploaded", fileId: result });
      })
      .catch((err) => {
        console.log(err);
        res.send({ msg: "Something went wrong" });
      });
  });

  // update user draft application  data
  app.patch("/updateDraftApplicationData/:id", async (req, res) => {
    const userId = req.params.id;
    const newDraftData = req.body;

    const applicationNo = newDraftData?.applicationNo;

    // console.log(userId, "USERID", "NEW DRAFT", newDraftData);

    const filter = { userId, applicationNo };

    const OldApplicationData = await draftApplicationCollection.findOne(filter);

    // console.log(oldDraftData, "OLD DRAFT MAIN");

    console.log(OldApplicationData, "Old draft data");

    // const findExistingData = oldDraftData.findIndex(
    //   (application) => application.applicationNo === newDraftData.applicationNo
    // );

    // console.log(findExistingData);

    // console.log(findExistingData, "findExistingData");

    // if (findExistingData === -1) {
    //   oldDraftData.push(newDraftData);
    // } else {
    //   if (
    //     newDraftData?.drawing ||
    //     newDraftData?.payment ||
    //     newDraftData?.documents
    //   ) {
    //     deletePreviousFile(oldDraftData[findExistingData], newDraftData);
    //   }
    //   oldDraftData[findExistingData] = {
    //     ...oldDraftData[findExistingData],
    //     ...newDraftData,
    //   };

    //   // console.log(oldDraftData[findExistingData], "FINNODJFLSDFJLDKS:J;l");
    // }

    if (
      newDraftData?.drawing ||
      newDraftData?.payment ||
      newDraftData?.documents
    ) {
      deletePreviousFile(OldApplicationData, newDraftData);
    }
    const updatedData = {
      ...OldApplicationData,
      ...newDraftData,
    };

    const updateDoc = {
      $set: updatedData,
    };

    // console.log(oldDraftData[findExistingData]);
    // console.log(newDraftData);

    const result = await draftApplicationCollection.updateOne(
      filter,
      updateDoc
    );

    res.send(result);
  });

  app.patch("/recommendDataOfPs", async (req, res) => {
    // console.log(req.body, "req body");

    const appNo = req.query.appNo;

    const newData = req.body;
    console.log(newData);

    const filter = {
      applicationNo: appNo,
    };

    const findApplication = await submitApplicationCollection.findOne(filter);

    // console.log(findApplication, "Find application");

    const updateData = { ...findApplication, ...newData };

    console.log(findApplication, "findApplication");

    const updateDoc = {
      $set: updateData,
    };

    // console.log(oldDraftData[findExistingData]);
    // console.log(newDraftData);

    const result = await submitApplicationCollection.updateOne(
      filter,
      updateDoc
    );

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

    // const result = await userCollection.updateOne(
    //   { _id: new ObjectId(`${userID}`) },
    //   { $pull: { draftApplication: { applicationNo } } }
    // );

    const removeApplication = await draftApplicationCollection.deleteOne({
      userId: userID,
      applicationNo,
    });

    res.send(removeApplication);
  });

  // delete specific application information. This is used for sending data into the department. At first the desired application data will be removed from the draft application data and stored in the submit application collection
  app.delete("/deleteApplication", async (req, res) => {
    const data = JSON.parse(req.query.data);
    console.log("Data:", data);

    const { userId, applicationNo } = data;

    console.log(userId, "UserId");

    const findApplication = await draftApplicationCollection.findOne({
      userId,
      applicationNo,
    });

    // const searchApplicationData = findApplicant?.draftApplication.find(
    //   (application) => application.applicationNo === applicationNo
    // );

    console.log(findApplication);

    const date = new Date();

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    const submitDate = `${day}-${month}-${year}`;

    const resultOfInsertData = await submitApplicationCollection.insertOne({
      ...findApplication,
      submitDate,
      status: "Pending at PS",
    });

    // const resultOfDeleteData = await userCollection.updateOne(
    //   { _id: new ObjectId(`${userId}`) },
    //   { $pull: { draftApplication: { applicationNo } } }
    // );

    const resultOfDeleteData = await draftApplicationCollection.deleteOne({
      userId,
      applicationNo,
    });

    console.log(resultOfDeleteData);

    res.send(resultOfDeleteData);
  });

  app.delete("/submitPsDecision", async (req, res) => {
    const appNo = req.query.appNo;
    // console.log(appNo);

    const findApplication = await submitApplicationCollection.findOne({
      applicationNo: appNo,
    });
    console.log(findApplication, "findApplication");
  });
}

run().catch(console.dir);

// Export the Express API
module.exports = app;
