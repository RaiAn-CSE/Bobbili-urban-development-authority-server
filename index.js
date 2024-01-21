const express = require("express");
const cors = require("cors");
const app = express();
const mime = require("mime-types");
const multer = require("multer");
const stream = require("stream");
const { DateTime } = require("luxon");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const storage = multer.memoryStorage(); // Store file in memory (can also use diskStorage)
const upload = multer({ storage: storage });
// app.use(uploadRouter);
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

require("dotenv").config();
const jwt = require("jsonwebtoken");

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
    // const extractOldData = Object.values(oldData.documents);
    // const extractNewData = Object.values(newData.documents);

    function checkExistImageId(extractOldData, extractNewData) {
      extractNewData.forEach((newValue) => {
        extractOldData?.forEach((oldValue) => {
          if (
            oldValue?.id === newValue?.id &&
            oldValue?.imageId !== newValue?.imageId
          ) {
            fileIdArr.push(oldValue?.imageId);
          }
        });
      });
    }

    const extractOldDefaultData = oldData?.documents?.default;
    const extractNewDefaultData = newData?.documents?.default;

    checkExistImageId(extractOldDefaultData, extractNewDefaultData);

    const extractOldDynamicData = oldData?.documents?.dynamic;
    const extractNewDynamicData = newData?.documents?.dynamic;

    checkExistImageId(extractOldDynamicData, extractNewDynamicData);
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

server.listen(port, () => {
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
  const approvedCollection = client
    .db("Construction-Application")
    .collection("approvedApplication");
  const shortfallCollection = client
    .db("Construction-Application")
    .collection("shortfallApplication");
  const rejectedCollection = client
    .db("Construction-Application")
    .collection("rejectedApplication");

  const districtCollection = client
    .db("Construction-Application")
    .collection("districts");

  const messageCollection = client
    .db("Construction-Application")
    .collection("messageRequest");

  const visitorCountCollection = client
    .db("Construction-Application")
    .collection("visitorCount");

  // visitor count api

  app.get("/getVisitorCount", async (req, res) => {
    const result = await visitorCountCollection.find({}).toArray();
    res.send(result);
  });

  app.patch("/updateWithLoggedIn", async (req, res) => {
    console.log("visitor count");

    const userId = JSON.parse(req.query.userId);

    const updateDoc = {
      $set: { isLoggedIn: 1 },
    };
    const filter = { _id: new ObjectId(userId) };
    const updateLoggedInfo = await userCollection.updateOne(filter, updateDoc);

    const result = await visitorCountCollection.updateOne(
      { _id: new ObjectId("65886ee5b7ea9902499d4dca") },
      { $inc: { count: 1 } }
    );

    console.log(result);

    res.send(result);
  });

  // handover by ps
  app.patch("/handOveredByPs", async (req, res) => {
    const id = JSON.parse(req.query.id);
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: { handOver: "true" },
    };
    const result = await userCollection.updateOne(filter, updateDoc);
    res.send(result);
  });

  // chat box related api

  app.post("/messageRequest", async (req, res) => {
    const data = req.body;
    console.log(data);

    const query = { userId: data.userId };
    const searchExistResult = await messageCollection.deleteOne(query);

    console.log(searchExistResult, "Search result");

    if (searchExistResult.acknowledged) {
      const insertData = {
        text: [],
        chatEnd: 0,
        isAccepted: 0,
        acceptedBy: "",
        noResponse: { condition: false, query: "" },
        leave: false,
        timeUp: false,
        ...data,
      };
      const result = await messageCollection.insertOne(insertData);
      res.send(result);
    }
  });

  app.get("/messageRequest", async (req, res) => {
    const result = await messageCollection
      .find({ "noResponse.condition": false, isAccepted: 0, timeUp: false })
      .toArray();
    res.send(result);
  });

  app.patch("/messageRequest", async (req, res) => {
    console.log(req.query.update);
    const { id, action, acceptedBy, message } = JSON.parse(req.query.update);
    const query = { _id: new ObjectId(id) };

    const findUser = await messageCollection.findOne(query);
    let data;

    if (action === "accept") {
      data = {
        ...findUser,
        acceptedBy,
        isAccepted: 1,
        newTextFromCustomer: [],
      };
    }
    if (action === "timeUp") {
      data = { ...findUser, timeUp: true };
      console.log(data, "TIMEUP");
    }

    if (action === "requestAgain") {
      console.log(findUser, "FIND USER");
      data = {
        ...findUser,
        timeUp: false,
      };
    }

    if (action === "chatEnd") {
      data = { ...findUser, chatEnd: 1 };
    }
    if (action === "text") {
      findUser["text"].push(message);

      if (!message?.userId?.toLowerCase()?.includes("admin")) {
        findUser["newTextFromCustomer"].push(message?.message);
      }
      data = { ...findUser };
    }

    if (action === "leaveMessage") {
      data = { ...findUser, noResponse: { condition: true, query: message } };
    }

    if (action === "trackCustomerNewMessage") {
      findUser["newTextFromCustomer"] = [];
      data = { ...findUser };
    }

    if (action === "leaveFromTheMessage") {
      if ("leave" in findUser) {
        findUser["leave"] = true;
      }
      data = { ...findUser };
    }

    console.log(data, "AFTER UPDATED");
    const updatedDoc = {
      $set: { ...data },
    };

    const result = await messageCollection.updateOne(query, updatedDoc);
    console.log(result);
    res.send(result);
  });

  app.get("/missedMessage", async (req, res) => {
    const result = await messageCollection
      .find({ "noResponse.condition": true })
      .toArray();

    res.send(result);
  });

  app.delete("/messageRequest", async (req, res) => {
    const id = req.query.id;

    const query = { _id: new ObjectId(id) };

    const result = await messageCollection.deleteOne(query);

    res.send(result);
  });

  app.get("/acceptMessage", async (req, res) => {
    const acceptedBy = JSON.parse(req.query.role);
    console.log(acceptedBy, "Accepted by");
    const result = await messageCollection
      .find({ isAccepted: 1, acceptedBy })
      .toArray();
    res.send(result);
  });

  app.get("/messages", async (req, res) => {
    const id = req.query.id;

    const result = await messageCollection.findOne({ _id: new ObjectId(id) });
    res.send(result);
  });

  const users = [
    { id: "admin1", socketId: "", connected: false },
    { id: "admin2", socketId: "", connected: false },
  ];

  io.on("connection", (socket) => {
    console.log("Client connected", socket.id);

    socket.on("login", (data) => {
      console.log(data, "DATA");
      const findIndex = users.findIndex((user) => user.id === data.id);
      console.log(findIndex, "FIND INDEX");
      if (findIndex !== -1) {
        const userData = users[findIndex];
        userData.socketId = socket.id;
        userData.connected = true;
      } else {
        users.push({ id: data.id, socketId: socket.id, connected: true });
      }

      console.log(users, "users");
    });

    // Emit a message to the client when new data is added
    const checkUpdateMessage = messageCollection.watch();
    checkUpdateMessage.on("change", async (change) => {
      console.log(change, "Change full document");
      if (
        change?.operationType === "update" ||
        change?.operationType === "delete" ||
        change?.operationType === "insert"
      ) {
        socket.emit("check-accept-message", {
          change,
        });
      }

      if (change?.operationType === "insert") {
        socket.emit("check-new-message", { change });
      }
    });

    socket.on("check-connection", (data) => {
      const findIndex = users.findIndex((user) => user?.id === data?.id);
      if (findIndex !== -1 && users[findIndex]?.connected) {
        socket.emit("connection-status", true);
      } else {
        socket.emit("connection-status", false);
      }
    });

    socket.on("private-message", ({ to, message }) => {
      const findIndex = users.findIndex((user) => user.id === to);
      console.log("FIND INDEX PM", findIndex, to, users);
      if (findIndex !== -1) {
        console.log(message, "message");
        const toSocketId = users[findIndex].socketId;
        io.to(toSocketId).emit("private-message", message);
      }

      // {
      //   console.log(`User ${to} is not online.`);
      //   // Handle the case where the recipient is not online or doesn't exist
      //   // You may want to emit an event back to the sender indicating the issue
      //   socket.emit("private-message-error", {
      //     to,
      //     message: "User not online",
      //   });
      // }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected", socket.id);
      const findIndex = users.findIndex((user) => user.socketId === socket.id);

      console.log("Find index", findIndex);
      if (findIndex !== -1) {
        // users.splice(findIndex, 1);
        console.log(users[findIndex], "Disconnected");
        users[findIndex].connected = false;
      }

      console.log(users);
    });
  });

  // jwt related api

  function generateToken(data) {
    return jwt.sign(data, process.env.PRIVATE_TOKEN, { expiresIn: "3h" });
  }

  function verifyToken(req, res, next) {
    const bearerHeader = req?.headers?.authorization;

    console.log(bearerHeader, typeof bearerHeader, "bearer header");

    if (bearerHeader === "null" || typeof bearerHeader === "undefined") {
      console.log("BACHA HERE");
      res.status(401).send({ message: "Unauthorized Access" });
    } else {
      console.log("HERE");
      const bearer = bearerHeader.split(" ");
      const token = bearer[1];
      req.token = token;
      next();
    }
  }

  app.post("/jwt", async (req, res) => {
    const data = req.body;
    console.log(data, "JWT");
    const token = generateToken(data);
    const bearerToken = `bearer ${token}`;
    console.log(bearerToken, "Bearer token");

    // console.log(res.cookie(), "response cookie");
    res.status(200).json({ success: true, token: bearerToken });
  });

  app.get("/documents", async (req, res) => {
    const result = await documentPageCollection.find({}).toArray();
    res.send(result);
  });

  // get users data
  app.get("/getUser", async (req, res) => {
    const id = req.query.id;
    console.log(id, "ID");

    const result = await userCollection.findOne({ userId: id });

    console.log(result);

    if (result) {
      const { _id, role, userId, password, name, gender } = result;

      const userInfo = { _id, role, userId, password, name, gender };

      if (role?.toLowerCase() === "ps") {
        userInfo["handOver"] = result?.handOver;
      }

      res.send({
        status: 1,
        userInfo,
      });
    } else {
      res.send({
        status: 0,
      });
    }
  });

  // users all information
  app.get("/userInformation", async (req, res) => {
    const id = req.query.id;
    console.log(id, "ID");

    const result = await userCollection.findOne({ userId: id });
    res.send(result);
  });

  // get all users
  app.get("/allUser", async (req, res) => {
    // jwt.verify(req.token, process.env.PRIVATE_TOKEN, async function (err) {
    //   if (err) {
    //     console.log("object");
    //     res.status(400).send({ message: "Unauthorized access" });
    //   } else {
    //     const cursor = userCollection.find({});
    //     const result = await cursor.toArray();
    //     res.send(result);
    //   }
    // });

    const cursor = userCollection.find({});
    const result = await cursor.toArray();
    res.send(result);
  });

  // get all applications
  app.get("/allApplications", async (req, res) => {
    const draftApplications = await draftApplicationCollection
      .find({})
      .toArray();
    const submitApplications = await submitApplicationCollection
      .find({})
      .toArray();
    const approvedApplications = await approvedCollection.find({}).toArray();
    const shortfallApplications = await shortfallCollection.find({}).toArray();

    const result = [
      ...draftApplications,
      ...submitApplications,
      ...approvedApplications,
      ...shortfallApplications,
    ];
    res.send(result);
  });

  //get users draft application
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
    const { appNo, userId, role, page } = JSON.parse(req.query.data);
    console.log(req.query.data);

    console.log(appNo, userId);

    let result;
    if (page === "submit" || page === "home") {
      result = await submitApplicationCollection.findOne({
        applicationNo: appNo,
      });
    }
    if ((role === "LTP" && page === "draft") || page === "home") {
      result = await draftApplicationCollection.findOne({
        applicationNo: appNo,
      });
    }

    if (page === "approved" || page === "home") {
      result = await approvedCollection.findOne({
        applicationNo: appNo,
      });
    }
    if (page === "shortfall" || page === "home") {
      result = await shortfallCollection.findOne({
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

  // get application data
  app.get("/allPageWiseApplications", async (req, res) => {
    const { userId, searchApplicationName } = JSON.parse(req.query.data);

    console.log(userId, searchApplicationName);

    let result;
    if (searchApplicationName === "Submit Applications") {
      result = await submitApplicationCollection.find({ userId }).toArray();
    }
    if (searchApplicationName === "Approved Applications") {
      result = await approvedCollection.find({ userId }).toArray();
    }
    if (searchApplicationName === "Shortfall Applications") {
      console.log("Shortfall");
      result = await shortfallCollection.find({ userId }).toArray();
    }

    // console.log(result, "result");

    res.send(result);
  });

  // get all submit application data for PS
  app.get("/submitApplications", async (req, res) => {
    const id = req.query.userId;

    const findPsInfo = await userCollection.findOne({ _id: new ObjectId(id) });

    console.log(findPsInfo);

    const query = {
      "buildingInfo.generalInformation.district": findPsInfo.district,
      "buildingInfo.generalInformation.mandal": findPsInfo.mandal,
      "buildingInfo.generalInformation.gramaPanchayat":
        findPsInfo?.gramaPanchayat,
    };

    console.log(query, "Query");

    const result = await submitApplicationCollection.find(query).toArray();

    console.log(result, "Result");
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

  const sumOfArrayElements = (arr) => {
    const sum = arr.reduce((accumulator, currentValue) => {
      return accumulator + currentValue;
    }, 0);
    return sum;
  };
  const extractCharges = (allApplication) => {
    // uda Charge extract
    const extractUdaCharge = allApplication?.map((eachApplication) => {
      // console.log(eachApplication, "Each");
      const udaCharge = eachApplication?.payment?.udaCharge?.UDATotalCharged;

      console.log(udaCharge, "first");

      const udaChargeNumber = Number(udaCharge);

      console.log(udaChargeNumber, "Number");

      const finalUdaCharge = isNaN(udaChargeNumber) ? 0 : udaChargeNumber;

      console.log(finalUdaCharge, "Final");

      return finalUdaCharge;
    });
    const extractPanchayatCharge = allApplication?.map((eachApplication) => {
      // console.log(eachApplication, "Each");
      const panchayatCharge =
        eachApplication?.payment?.gramaPanchayatFee?.GramaPanchayetTotalCharged;

      console.log(panchayatCharge, "first");

      const panchayatChargeNumber = Number(panchayatCharge);

      console.log(panchayatCharge, "Number");

      const finalPanchayatCharge = isNaN(panchayatChargeNumber)
        ? 0
        : panchayatChargeNumber;

      console.log(finalPanchayatCharge, "Final");

      return finalPanchayatCharge;
    });
    const extractGreenFee = allApplication?.map((eachApplication) => {
      // console.log(eachApplication, "Each");
      const greenFee =
        eachApplication?.payment?.greenFeeCharge?.greenFeeChargeAmount;

      console.log(greenFee, "first");

      const greenFeeNumber = Number(greenFee);

      console.log(greenFeeNumber, "Number");

      const finalGreenFee = isNaN(greenFeeNumber) ? 0 : greenFeeNumber;

      console.log(finalGreenFee, "Final");

      return finalGreenFee;
    });
    const extractLabourCharge = allApplication?.map((eachApplication) => {
      // console.log(eachApplication, "Each");
      const labourCharge =
        eachApplication?.payment?.labourCessCharge?.labourCessOne;

      console.log(labourCharge, "first");

      const labourChargeNumber = Number(labourCharge);

      console.log(labourChargeNumber, "Number");

      const finalLabourCharge = isNaN(labourChargeNumber)
        ? 0
        : labourChargeNumber;

      console.log(finalLabourCharge, "Final");

      return finalLabourCharge;
    });

    const totalUdaCharge = sumOfArrayElements(extractUdaCharge);
    const totalPanchayatCharge = sumOfArrayElements(extractPanchayatCharge);
    const totalGreenFee = sumOfArrayElements(extractGreenFee);
    const totalLabourCharge = sumOfArrayElements(extractLabourCharge);

    return {
      totalUdaCharge,
      totalPanchayatCharge,
      totalGreenFee,
      totalLabourCharge,
    };
  };

  const findApplicationData = async (query, role, id) => {
    let totalSubmitApplications,
      totalApprovedApplications,
      totalShortfallApplications,
      totalRejectedApplications,
      totalDraftApplications;

    if (role === "ltp") {
      totalDraftApplications = await draftApplicationCollection
        .find({ _id: new ObjectId(id) })
        .toArray();
      totalSubmitApplications = await submitApplicationCollection
        .find(query)
        .toArray();
      totalApprovedApplications = await approvedCollection
        .find(query)
        .toArray();
      totalShortfallApplications = await shortfallCollection
        .find(query)
        .toArray();
      totalRejectedApplications = await rejectedCollection
        .find(query)
        .toArray();
      if (
        totalDraftApplications &&
        totalSubmitApplications &&
        totalApprovedApplications &&
        totalShortfallApplications &&
        totalRejectedApplications
      ) {
        return [
          totalDraftApplications,
          totalSubmitApplications,
          totalApprovedApplications,
          totalShortfallApplications,
          totalRejectedApplications,
        ];
      }
    } else if (role === "ps") {
      console.log("aschi ps");
      const findPsInfo = await userCollection.findOne({
        _id: new ObjectId(id),
      });

      console.log(findPsInfo, "ps info");

      console.log(query);

      totalSubmitApplications = await submitApplicationCollection
        .find({
          "buildingInfo.generalInformation.district": findPsInfo.district,
          "buildingInfo.generalInformation.mandal": findPsInfo.mandal,
          "buildingInfo.generalInformation.gramaPanchayat":
            findPsInfo?.gramaPanchayat,
        })
        .toArray();
      totalApprovedApplications = await approvedCollection
        .find(query)
        .toArray();
      totalShortfallApplications = await shortfallCollection
        .find(query)
        .toArray();
      totalRejectedApplications = await rejectedCollection
        .find(query)
        .toArray();

      console.log(
        totalSubmitApplications,
        totalApprovedApplications,
        totalShortfallApplications,
        totalRejectedApplications
      );
      if (
        totalSubmitApplications &&
        totalApprovedApplications &&
        totalShortfallApplications &&
        totalRejectedApplications
      ) {
        return [
          totalSubmitApplications,
          totalApprovedApplications,
          totalShortfallApplications,
          totalRejectedApplications,
        ];
      }
    } else {
      totalSubmitApplications = await submitApplicationCollection
        .find(query)
        .toArray();
      totalApprovedApplications = await approvedCollection
        .find(query)
        .toArray();
      totalShortfallApplications = await shortfallCollection
        .find(query)
        .toArray();
      totalRejectedApplications = await rejectedCollection
        .find(query)
        .toArray();
      if (
        totalSubmitApplications &&
        totalApprovedApplications &&
        totalShortfallApplications &&
        totalRejectedApplications
      ) {
        return [
          totalSubmitApplications,
          totalApprovedApplications,
          totalShortfallApplications,
          totalRejectedApplications,
        ];
      }
    }
  };
  // get number of applications
  app.get("/totalApplications", async (req, res) => {
    let role;
    let userInfo;

    if (req?.query?.data) {
      userInfo = JSON.parse(req?.query?.data);
      role = userInfo?.role?.toLowerCase();
    }

    let query = {};
    // let queryForPSExceptSubmitApplication = { psId: userInfo._id };

    console.log(role, "role");
    console.log(query, "USER INFO");

    if (role === "ltp" || role === "ps") {
      if (role === "ps") {
        // const findPsInfo = await userCollection.findOne({
        //   _id: new ObjectId(userInfo?._id),
        // });
        // console.log(findPsInfo);
        // query = {
        //   "buildingInfo.generalInformation.district": findPsInfo.district,
        //   "buildingInfo.generalInformation.mandal": findPsInfo.mandal,
        //   "buildingInfo.generalInformation.gramaPanchayat":
        //     findPsInfo?.gramaPanchayat,
        // };
      }

      if (role === "ltp") {
      }

      // const total =
      //   totalRejectedApplications.length +
      //   totalApprovedApplications.length +
      //   totalShortfallApplications.length;

      // console.log(totalApprovedApplications, "APPROVED");
      // console.log(totalShortfallApplications, "SHORTFALL");

      // console.log(total, "TOTAL");

      // const rejectedAppCharges = extractCharges(totalRejectedApplications);
      // const approvedAppCharges = extractCharges(totalApprovedApplications);
      // const shortfallAppCharges = extractCharges(totalShortfallApplications);

      // const charges = sumOfAllAppCharges(
      //   rejectedAppCharges,
      //   approvedAppCharges,
      //   shortfallAppCharges
      // );

      // let result;

      console.log("INSIDE LTP OR PS");

      if (role === "ltp") {
        const id = userInfo._id;
        query = { userId: id };
        const [
          totalDraftApplications,
          totalSubmitApplications,
          totalApprovedApplications,
          totalShortfallApplications,
          totalRejectedApplications,
        ] = await findApplicationData(query, role, id);
        result = {
          applications: {
            createdApplications: totalDraftApplications,
            submitApplication: totalSubmitApplications,
            approvedApplications: totalApprovedApplications,
            shortfallApplications: totalShortfallApplications,
            totalRejectedApplications: totalRejectedApplications,
          },
          totalApplication: {
            created: totalDraftApplications.length,
            submitted: totalSubmitApplications.length,
            rejected: totalRejectedApplications.length,
            approved: totalApprovedApplications.length,
            shortfall: totalShortfallApplications.length,
          },
        };
      } else {
        const id = userInfo._id;
        query = { psId: id };

        const [
          totalSubmitApplications,
          totalApprovedApplications,
          totalShortfallApplications,
          totalRejectedApplications,
        ] = await findApplicationData(query, role, id);

        result = {
          applications: {
            receivedApplications: totalSubmitApplications,
            approvedApplications: totalApprovedApplications,
            shortfallApplications: totalShortfallApplications,
            totalRejectedApplications: totalRejectedApplications,
          },
          totalApplication: {
            received: totalSubmitApplications.length,
            rejected: totalRejectedApplications.length,
            approved: totalApprovedApplications.length,
            shortfall: totalShortfallApplications.length,
          },
          // charges,
        };
      }

      res.send(result);
    } else {
      const [
        totalSubmitApplications,
        totalApprovedApplications,
        totalShortfallApplications,
        // totalRejectedApplications,
      ] = await findApplicationData(query);
      const total =
        totalSubmitApplications.length +
        totalApprovedApplications.length +
        totalShortfallApplications.length;
      // totalRejectedApplications.length;

      // const submitAppCharges = extractCharges(totalSubmitApplications);
      // const approvedAppCharges = extractCharges(totalApprovedApplications);
      // const shortfallAppCharges = extractCharges(totalShortfallApplications);

      // const charges = sumOfAllAppCharges(
      //   submitAppCharges,
      //   approvedAppCharges,
      //   shortfallAppCharges
      // );

      const result = {
        applications: {
          approvedApplications: totalApprovedApplications,
          shortfallApplications: totalShortfallApplications,
          submittedApplications: totalSubmitApplications,
          // rejectedApplications: totalRejectedApplications,
        },
        totalApplication: {
          received: totalSubmitApplications.length,
          approved: totalApprovedApplications.length,
          shortfall: totalShortfallApplications.length,
          // rejected: totalRejectedApplications.length,
          total,
        },
        // charges,
      };

      res.send(result);
    }
  });

  // get specific outward applications
  // app.get("/getOutwardApplications",async(req,res)=>{
  //   const id =req.query.userId;

  //   const findPsInfo=await userCollection.findOne({_id:new ObjectId(id)})

  // })

  // (async function hi() {

  //   const totalSubmitApplications = await submitApplicationCollection
  //     .find({})
  //     .toArray();
  //   const totalApprovedApplications = await approvedCollection
  //     .find({})
  //     .toArray();
  //   const totalShortfallApplications = await shortfallCollection
  //     .find({})
  //     .toArray();

  //   console.log(
  //     totalSubmitApplications.length,
  //     totalApprovedApplications.length,
  //     totalShortfallApplications.length
  //   );

  // })();

  // function of finding application based on district

  const sumOfAllAppCharges = (submitApp, approvedApp, shortfallApp) => {
    const sumOfAllUdaCharges =
      submitApp?.totalUdaCharge +
      approvedApp?.totalUdaCharge +
      shortfallApp?.totalUdaCharge;

    const sumOfAllPanchayatCharges =
      submitApp?.totalPanchayatCharge +
      approvedApp?.totalPanchayatCharge +
      shortfallApp?.totalPanchayatCharge;

    const sumOfAllGreenFeeCharges =
      submitApp?.totalGreenFee +
      approvedApp?.totalGreenFee +
      shortfallApp?.totalGreenFee;

    const sumOfAllLabourCharges =
      submitApp?.totalLabourCharge +
      approvedApp?.totalLabourCharge +
      shortfallApp?.totalLabourCharge;

    return {
      totalUdaCharge: sumOfAllUdaCharges,
      totalPanchayatCharge: sumOfAllPanchayatCharges,
      totalGreenFee: sumOfAllGreenFeeCharges,
      totalLabourCharge: sumOfAllLabourCharges,
    };
  };

  const searchBasedOnDistrict = (
    flag,
    totalSubmitApplications,
    totalApprovedApplications,
    totalShortfallApplications,
    district,
    mandal,
    panchayat,
    date
  ) => {
    const districtFromSubmitApplication = totalSubmitApplications?.filter(
      (application) =>
        application.buildingInfo?.generalInformation?.district === district
    );

    // console.log(districtFromSubmitApplication, "FROM");

    const districtFromApprovedApplication = totalApprovedApplications?.filter(
      (application) =>
        application.buildingInfo?.generalInformation?.district === district
    );

    const districtFromShortfallApplication = totalShortfallApplications?.filter(
      (application) =>
        application.buildingInfo?.generalInformation?.district === district
    );

    if (flag === 1) {
      const submitAppCharges = extractCharges(districtFromSubmitApplication);
      const approvedAppCharges = extractCharges(
        districtFromApprovedApplication
      );
      const shortfallAppCharges = extractCharges(
        districtFromShortfallApplication
      );

      const charges = sumOfAllAppCharges(
        submitAppCharges,
        approvedAppCharges,
        shortfallAppCharges
      );

      const result = {
        applications: {
          approvedApplications: districtFromApprovedApplication,
          shortfallApplications: districtFromShortfallApplication,
          submittedApplications: districtFromSubmitApplication,
        },
        totalApplication: {
          submitted: districtFromSubmitApplication.length,
          approved: districtFromApprovedApplication.length,
          shortfall: districtFromShortfallApplication.length,
        },
        charges,
      };
      console.log(result, "district");

      return result;
      // return result;
    } else {
      const result = searchBasedOnMandal(
        flag,
        districtFromSubmitApplication,
        districtFromApprovedApplication,
        districtFromShortfallApplication,
        mandal,
        panchayat,
        date
      );

      return result;
    }
  };

  // function of finding application based on mandal
  const searchBasedOnMandal = (
    flag,
    submit,
    approve,
    shortfall,
    mandal,
    panchayat,
    date
  ) => {
    // console.log("SEARCH ON MANDAL");
    const filterFromSubmit = submit.filter(
      (application) =>
        application?.buildingInfo?.generalInformation?.mandal === mandal
    );
    const filterFromApproved = approve.filter(
      (application) =>
        application?.buildingInfo?.generalInformation?.mandal === mandal
    );
    const filterFromShortfall = shortfall.filter(
      (application) =>
        application?.buildingInfo?.generalInformation?.mandal === mandal
    );

    if (flag !== 2) {
      const result = searchBasedOnPanchayat(
        flag,
        filterFromSubmit,
        filterFromApproved,
        filterFromShortfall,
        panchayat,
        date
      );

      return result;
    } else {
      const submitAppCharges = extractCharges(filterFromSubmit);
      const approvedAppCharges = extractCharges(filterFromApproved);
      const shortfallAppCharges = extractCharges(filterFromShortfall);

      const charges = sumOfAllAppCharges(
        submitAppCharges,
        approvedAppCharges,
        shortfallAppCharges
      );

      const result = {
        totalApplication: {
          submitted: filterFromSubmit.length,
          approved: filterFromApproved.length,
          shortfall: filterFromShortfall.length,
        },
        applications: {
          approvedApplications: filterFromApproved,
          shortfallApplications: filterFromShortfall,
          submittedApplications: filterFromSubmit,
        },
        charges,
      };
      console.log(result, "Mandal");
      return result;
    }
  };

  // function of finding application based on panchayat
  const searchBasedOnPanchayat = (
    flag,
    submit,
    approve,
    shortfall,
    panchayat,
    date
  ) => {
    // console.log("SEARCH ON Panchayat");
    const filterFromSubmit = submit.filter(
      (application) =>
        application?.buildingInfo?.generalInformation?.gramaPanchayat ===
        panchayat
    );
    const filterFromApproved = approve.filter(
      (application) =>
        application?.buildingInfo?.generalInformation?.gramaPanchayat ===
        panchayat
    );
    const filterFromShortfall = shortfall.filter(
      (application) =>
        application?.buildingInfo?.generalInformation?.gramaPanchayat ===
        panchayat
    );

    if (flag === 4) {
      const result = searchBasedOnDate(
        filterFromSubmit,
        filterFromApproved,
        filterFromShortfall,
        date
      );

      return result;
    } else {
      const submitAppCharges = extractCharges(filterFromSubmit);
      const approvedAppCharges = extractCharges(filterFromApproved);
      const shortfallAppCharges = extractCharges(filterFromShortfall);

      const charges = sumOfAllAppCharges(
        submitAppCharges,
        approvedAppCharges,
        shortfallAppCharges
      );

      const result = {
        totalApplication: {
          submitted: filterFromSubmit.length,
          approved: filterFromApproved.length,
          shortfall: filterFromShortfall.length,
        },
        applications: {
          approvedApplications: filterFromApproved,
          shortfallApplications: filterFromShortfall,
          submittedApplications: filterFromSubmit,
        },
        charges,
      };
      console.log(result, "PANCHAYAT");
      return result;
    }
  };

  // function of finding application based on date
  const searchBasedOnDate = (submit, approve, shortfall, date) => {
    console.log("Search based on date");
    const filterFromSubmit = submit.filter((application) => {
      const dateFromDB = application?.submitDate
        ?.split("-")
        ?.reverse()
        ?.join("-");
      if (date === "7 days" && checkLastWeek(dateFromDB)) {
        return application;
      }

      if (date === "1 months" && checkMonths(dateFromDB, 1)) {
        return application;
      }

      if (date === "6 months" && checkMonths(dateFromDB, 6)) {
        return application;
      }

      if (date === "1 year" && checkMonths(dateFromDB, 12)) {
        return application;
      }
    });
    const filterFromApproved = approve.filter((application) => {
      const dateFromDB = application?.psSubmitDate
        ?.split("-")
        ?.reverse()
        ?.join("-");
      if (date === "7 days" && checkLastWeek(dateFromDB)) {
        return application;
      }

      if (date === "6 months" && checkMonths(dateFromDB, 6)) {
        return application;
      }

      if (date === "1 months" && checkMonths(dateFromDB, 1)) {
        return application;
      }

      if (date === "1 year" && checkMonths(dateFromDB, 12)) {
        return application;
      }
    });
    const filterFromShortfall = shortfall.filter((application) => {
      const dateFromDB = application?.psSubmitDate
        ?.split("-")
        ?.reverse()
        ?.join("-");
      if (date === "7 days" && checkLastWeek(dateFromDB)) {
        return application;
      }

      if (date === "6 months" && checkMonths(dateFromDB, 6)) {
        return application;
      }
      if (date === "1 months" && checkMonths(dateFromDB, 1)) {
        return application;
      }

      if (date === "1 year" && checkMonths(dateFromDB, 12)) {
        return application;
      }
    });

    const submitAppCharges = extractCharges(filterFromSubmit);
    const approvedAppCharges = extractCharges(filterFromApproved);
    const shortfallAppCharges = extractCharges(filterFromShortfall);

    const charges = sumOfAllAppCharges(
      submitAppCharges,
      approvedAppCharges,
      shortfallAppCharges
    );

    const result = {
      totalApplication: {
        submitted: filterFromSubmit.length,
        approved: filterFromApproved.length,
        shortfall: filterFromShortfall.length,
      },
      applications: {
        approvedApplications: filterFromApproved,
        shortfallApplications: filterFromShortfall,
        submittedApplications: filterFromSubmit,
      },
      charges,
    };

    return result;
  };

  const checkLastWeek = (dateFromDB) => {
    console.log(dateFromDB, "FIRST GET DATE");
    const targetDate = new Date(dateFromDB);

    const currentDate = new Date();

    const timeDifference = currentDate - targetDate;

    const daysDifference = timeDifference / (24 * 3600 * 1000);

    console.log(daysDifference);

    if (daysDifference >= 1 && daysDifference < 8) {
      console.log(targetDate, daysDifference);
      return 1;
    } else {
      return 0;
    }
  };

  const checkMonths = (dateFromDB, duration) => {
    const targetDate = new Date(dateFromDB);

    const currentDate = new Date();

    const yearDifference = currentDate.getFullYear() - targetDate.getFullYear();

    const monthDifference = currentDate.getMonth() - targetDate.getMonth();

    const exactMonthDifference = yearDifference * 12 + monthDifference;

    console.log(
      exactMonthDifference,
      targetDate,
      dateFromDB,
      "Exact month difference"
    );

    if (exactMonthDifference > 0 && exactMonthDifference < duration + 1) {
      return 1;
    } else {
      return 0;
    }
  };

  // console.log(checkMonths("2022-09-12", 12));

  const getChartData = async (flag, district, mandal, panchayat, date) => {
    const totalSubmitApplications = await submitApplicationCollection
      .find({})
      .toArray();
    const totalApprovedApplications = await approvedCollection
      .find({})
      .toArray();
    const totalShortfallApplications = await shortfallCollection
      .find({})
      .toArray();

    let result;

    switch (flag) {
      case 1:
        result = searchBasedOnDistrict(
          flag,
          totalSubmitApplications,
          totalApprovedApplications,
          totalShortfallApplications,
          district
        );
        break;

      case 2:
        result = searchBasedOnDistrict(
          flag,
          totalSubmitApplications,
          totalApprovedApplications,
          totalShortfallApplications,
          district,
          mandal
        );
        break;

      case 3:
        result = searchBasedOnDistrict(
          flag,
          totalSubmitApplications,
          totalApprovedApplications,
          totalShortfallApplications,
          district,
          mandal,
          panchayat
        );
        break;

      case 4:
        result = searchBasedOnDistrict(
          flag,
          totalSubmitApplications,
          totalApprovedApplications,
          totalShortfallApplications,
          district,
          mandal,
          panchayat,
          date
        );
        break;
    }

    console.log(result, "BREAK");

    return result;
  };

  app.get("/filterApplications", async (req, res) => {
    const search = JSON.parse(req.query.search);
    console.log(search, "Search");
    if (search?.role === "ltp" || search?.role === "ps") {
      console.log("LTP OR PS");
      const id = search.id;
      let query = {};
      const searchDate = search.selectedDate;
      console.log(searchDate, "Search date");

      const today = DateTime.local();

      let allDates = [];
      let arrayOfApplications;
      let applicationWiseDates = {};

      if (search?.role === "ltp") {
        query = { userId: id };
        arrayOfApplications = await findApplicationData(
          query,
          search?.role,
          id
        );

        const [
          totalDraftApplications,
          totalSubmitApplications,
          totalApprovedApplications,
          totalShortfallApplications,
          totalRejectedApplications,
        ] = arrayOfApplications;

        // console.log(
        //   totalDraftApplications,
        //   "draft",
        //   totalSubmitApplications,
        //   "submit",
        //   totalApprovedApplications,
        //   "app",
        //   totalShortfallApplications,
        //   "short",
        //   totalRejectedApplications,
        //   "Reject"
        // );

        applicationWiseDates["New"] = totalDraftApplications.map((eachApp) => {
          return eachApp.createdDate;
        });
        applicationWiseDates["Submitted"] = totalSubmitApplications.map(
          (eachApp) => {
            return eachApp.createdDate;
          }
        );
        applicationWiseDates["Approved"] = totalApprovedApplications.map(
          (eachApp) => {
            return eachApp.createdDate;
          }
        );
        applicationWiseDates["Shortfall"] = totalShortfallApplications.map(
          (eachApp) => {
            return eachApp.createdDate;
          }
        );
        applicationWiseDates["Rejected"] = totalRejectedApplications.map(
          (eachApp) => {
            return eachApp.createdDate;
          }
        );

        // console.log(applicationWiseDates, "Application wise dates");

        arrayOfApplications.forEach((appCollection) => {
          appCollection.forEach((eachApp) => {
            allDates.push(eachApp.createdDate);
          });
        });
      } else {
        query = { psId: id };
        arrayOfApplications = await findApplicationData(
          query,
          search?.role,
          id
        );

        const [
          totalSubmitApplications,
          totalApprovedApplications,
          totalShortfallApplications,
          totalRejectedApplications,
        ] = arrayOfApplications;

        // console.log(
        //   totalSubmitApplications,
        //   "sub",
        //   totalApprovedApplications,
        //   "APP",
        //   totalShortfallApplications,
        //   "Short",
        //   totalRejectedApplications,
        //   "reject"
        // );

        applicationWiseDates["Submitted"] = totalSubmitApplications.map(
          (eachApp) => {
            return eachApp.submitDate;
          }
        );
        applicationWiseDates["Approved"] = totalApprovedApplications.map(
          (eachApp) => {
            return eachApp.submitDate;
          }
        );

        applicationWiseDates["Shortfall"] = totalShortfallApplications.map(
          (eachApp) => {
            return eachApp.submitDate;
          }
        );
        applicationWiseDates["Rejected"] = totalRejectedApplications.map(
          (eachApp) => {
            return eachApp.submitDate;
          }
        );

        arrayOfApplications.forEach((appCollection) => {
          appCollection.forEach((eachApp) => {
            allDates.push(eachApp.submitDate);
          });
        });
      }

      console.log(allDates, "All dates");

      // console.log(arrayOfApplications, "ARRAY OF APPLICATIONS");
      // console.log(allDates, "All Dates");

      const appType = Object.keys(applicationWiseDates);
      const appTypeDate = Object.values(applicationWiseDates);

      // search day wise data for ltp and ps
      if (searchDate === "1 week") {
        const last7Days = Array.from({ length: 7 }, (_, index) =>
          today.minus({ days: index }).toFormat("dd-MM-yyyy")
        );

        const result = {};
        const applicationWiseCount = {};

        // console.log(applicationWiseDates, "APP WISE DATES");

        console.log(last7Days, "LAST 7 DAYS");

        last7Days.forEach((date) => {
          const date1 = DateTime.fromFormat(date, "dd-MM-yyyy");
          let count = 0;

          console.log(appType, appTypeDate, "APP TYPE");
          appTypeDate.forEach((dates, index) => {
            let countApp = 0;
            console.log(dates, "Dates");
            dates?.forEach((eachDate) => {
              const date2 = DateTime.fromFormat(eachDate, "dd-MM-yyyy");
              // console.log(date1, date2, "DEDATE");
              console.log(date1, date2, "COUNT APP");
              if (date1.equals(date2)) {
                countApp++;
              }
            });
            if (applicationWiseCount[appType[index]]) {
              applicationWiseCount[appType[index]] =
                applicationWiseCount[appType[index]] + countApp;
            } else {
              applicationWiseCount[appType[index]] = countApp;
            }
          });

          allDates.forEach((each) => {
            const date2 = DateTime.fromFormat(each, "dd-MM-yyyy");
            if (date1.equals(date2)) {
              count++;
            }
          });

          result[date] = count;
        });

        console.log(last7Days, result, applicationWiseCount, "last 7 days");
        res.send({ result, applicationWiseCount });
      } else if (searchDate === "1 month") {
        const last4Weeks = Array.from({ length: 4 }, (_, index) =>
          today.minus({ weeks: index })
        );

        const last4WeeksDates = last4Weeks
          .reverse()
          .reduce((result, weekStart, index) => {
            const weekDates = Array.from({ length: 7 }, (_, index) =>
              weekStart.minus({ days: index }).toFormat("dd-MM-yyyy")
            );
            const weekResult = {};

            weekResult[`${index + 1} week`] = weekDates;

            // const result = {};

            return result.concat(weekResult);
          }, []);

        const result = {};
        const applicationWiseCount = {};

        last4WeeksDates.forEach((eachWeek) => {
          const weekDates = Object.values(eachWeek)[0];
          const weekName = Object.keys(eachWeek)[0];
          let count = 0;

          console.log(weekDates, "WEEK DATES");
          weekDates.forEach((date) => {
            const date1 = DateTime.fromFormat(date, "dd-MM-yyyy");
            console.log(date, "date");
            console.log(appTypeDate, "APP TYPE DATE");

            appTypeDate.forEach((dates, index) => {
              let countApp = 0;
              // console.log(dates, "Dates");
              dates?.forEach((eachDate) => {
                console.log(date, eachDate, "DDDD");
                const date2 = DateTime.fromFormat(eachDate, "dd-MM-yyyy");
                // console.log(date1, date2, "DEDATE");
                // console.log(date1, date2, "COUNT APP");
                if (date1.equals(date2)) {
                  // console.log("object");
                  countApp = countApp + 1;
                }
              });
              console.log(countApp, "CA");
              if (applicationWiseCount[appType[index]]) {
                applicationWiseCount[appType[index]] =
                  applicationWiseCount[appType[index]] + countApp;
              } else {
                applicationWiseCount[appType[index]] = countApp;
              }
              // console.log(countApp, "Count app");
            });

            // console.log(applicationWiseCount, "AWC");

            allDates.forEach((eachDate) => {
              const date2 = DateTime.fromFormat(eachDate, "dd-MM-yyyy");
              // console.log(date, eachDate);
              if (date1.equals(date2)) {
                count++;
              }
            });
          });

          result[weekName] = count;
        });

        console.log(
          last4Weeks,
          last4WeeksDates,
          result,
          applicationWiseCount,
          "LMD"
        );
        res.send({ result, applicationWiseCount });
      } else if (searchDate === "6 months") {
        const startOfThisMonth = today.startOf("month");
        const startOfPreviousSixMonths = Array.from({ length: 6 }, (_, index) =>
          today.minus({ months: index + 1 }).startOf("month")
        );

        const previousSixMonthsDates = startOfPreviousSixMonths
          .reverse()
          .reduce((result, monthStart) => {
            // Exclude the current month
            if (!monthStart.equals(startOfThisMonth)) {
              const monthDates = Array.from(
                { length: monthStart.daysInMonth },
                (_, index) =>
                  monthStart.set({ day: index + 1 }).toFormat("dd-MM-yyyy")
              );

              console.log(monthDates[0]);

              const date = DateTime.fromFormat(monthDates[0], "dd-MM-yyyy");
              const monthName = date.toLocaleString({ month: "long" });

              const monthWiseDate = {};

              monthWiseDate[monthName] = monthDates;

              return result.concat(monthWiseDate);
            }
            return result;
          }, []);

        let result = {};
        const applicationWiseCount = {};

        previousSixMonthsDates.forEach((eachMonth) => {
          const monthDates = Object.values(eachMonth)[0];
          const monthName = Object.keys(eachMonth)[0];

          let count = 0;
          monthDates.forEach((eachDate) => {
            const date1 = DateTime.fromFormat(eachDate, "dd-MM-yyyy");

            appTypeDate.forEach((dates, index) => {
              let countApp = 0;
              // console.log(dates, "Dates");
              dates?.forEach((eachDate) => {
                const date2 = DateTime.fromFormat(eachDate, "dd-MM-yyyy");
                // console.log(date1, date2, "DEDATE");
                // console.log(date1, date2, "COUNT APP");
                if (date1.equals(date2)) {
                  // console.log("object");
                  countApp = countApp + 1;
                }
              });
              console.log(countApp, "CA");
              if (applicationWiseCount[appType[index]]) {
                applicationWiseCount[appType[index]] =
                  applicationWiseCount[appType[index]] + countApp;
              } else {
                applicationWiseCount[appType[index]] = countApp;
              }
              // console.log(countApp, "Count app");
            });
            allDates.forEach((date) => {
              const date2 = DateTime.fromFormat(date, "dd-MM-yyyy");
              if (date1.equals(date2)) {
                count++;
              }
            });
          });

          result[monthName] = count;
        });

        console.log(
          previousSixMonthsDates,
          result,
          applicationWiseCount,
          "RES"
        );
        res.send({ result, applicationWiseCount });
      } else if (searchDate === "1 year") {
        // const endDate = DateTime.fromFormat(today, "yyyy-MM-dd");
        const startDate = today.minus({ years: 1 });

        const datesForLastYearByMonth = [];

        let currentDate = startDate;
        while (currentDate <= today) {
          const monthName = currentDate.toFormat("MMMM");
          const year = currentDate.toFormat("yyyy");
          const formattedDate = currentDate.toFormat("dd-MM-yyyy");

          // Check if the month exists in the array
          const existingMonth = datesForLastYearByMonth.find(
            (entry) => entry.month === monthName
          );

          if (existingMonth) {
            // If the month exists, add the date to its array
            existingMonth.dates.push(formattedDate);
          } else {
            // If the month doesn't exist, create a new entry
            datesForLastYearByMonth.push({
              month: monthName,
              year,
              dates: [formattedDate],
            });
          }

          currentDate = currentDate.plus({ days: 1 });
        }

        let result = {};
        const applicationWiseCount = {};

        datesForLastYearByMonth.forEach((eachMonth) => {
          const month = eachMonth.month + ", " + eachMonth.year;
          const monthDates = eachMonth.dates;

          console.log(monthDates, "MonthDates");
          let count = 0;
          monthDates.forEach((eachDate) => {
            const date1 = DateTime.fromFormat(eachDate, "dd-MM-yyyy");

            appTypeDate.forEach((dates, index) => {
              let countApp = 0;
              // console.log(dates, "Dates");
              dates?.forEach((eachDate) => {
                const date2 = DateTime.fromFormat(eachDate, "dd-MM-yyyy");
                // console.log(date1, date2, "DEDATE");
                // console.log(date1, date2, "COUNT APP");
                if (date1.equals(date2)) {
                  // console.log("object");
                  countApp = countApp + 1;
                }
              });
              console.log(countApp, "CA");
              if (applicationWiseCount[appType[index]]) {
                applicationWiseCount[appType[index]] =
                  applicationWiseCount[appType[index]] + countApp;
              } else {
                applicationWiseCount[appType[index]] = countApp;
              }
              // console.log(countApp, "Count app");
            });

            allDates.forEach((date) => {
              const date2 = DateTime.fromFormat(date, "dd-MM-yyyy");
              if (date1.equals(date2)) {
                count++;
              }
            });
          });

          result[month] = count;
        });
        console.log(result, applicationWiseCount, "RESULT");
        res.send({ result, applicationWiseCount });
      }
    } else {
      const district = search.district;
      const mandal = search.mandal;
      const panchayat = search.panchayat;
      const date = search.date;

      let flag;

      flag = district.length ? 1 : flag;
      flag = mandal.length ? 2 : flag;
      flag = panchayat.length ? 3 : flag;
      flag = date.length ? 4 : flag;
      console.log(district, mandal, panchayat, date, flag);

      const result = await getChartData(
        flag,
        district,
        mandal,
        panchayat,
        date
      );

      console.log(result, "ALL RESULT");

      res.send(result);
    }
  });

  app.get("/getDateWiseApplications", async (req, res) => {
    console.log(req.query, "QUERY");
  });

  //get serial number
  app.get("/getSerialNumber", async (req, res) => {
    // get all collections applications
    const draftApplications = await draftApplicationCollection
      .find({})
      .toArray();
    const submittedApplications = await submitApplicationCollection
      .find({})
      .toArray();
    const approvedApplications = await approvedCollection.find({}).toArray();
    const shortfallApplications = await shortfallCollection.find({}).toArray();

    const allApplications = [
      ...draftApplications,
      ...submittedApplications,
      ...approvedApplications,
      ...shortfallApplications,
    ];

    if (allApplications?.length) {
      let applicationNumbers = allApplications.map((application) => {
        return Number(application?.applicationNo.split("/")[1]);
      });

      applicationNumbers = applicationNumbers.sort(function (a, b) {
        return a - b;
      });

      console.log(applicationNumbers, "Application numbers");

      const lastSerialNumber = Math.max(...applicationNumbers);

      console.log(lastSerialNumber, "SERIAL");
      res.send({ serialNo: lastSerialNumber + 1 });
    } else {
      res.send({ serialNo: 1 });
    }
  });

  // get districts
  app.get("/getDistricts", async (req, res) => {
    const result = await districtCollection.find({}).toArray();
    res.send(result);
  });

  // get all rejected applications
  app.get("/getRejectedApplications", async (req, res) => {
    const userId = req?.query?.userId;

    console.log(userId, "User id");
    const result = await rejectedCollection.find({ userId }).toArray();

    console.log(result, "Rejected");
    res.send(result);
  });

  // get specific approved applications
  app.get("/getSpecificApprovedApplication", async (req, res) => {
    const appNo = JSON.parse(req.query.appNo);
    const result = await approvedCollection.findOne({ applicationNo: appNo });
    res.send(result);
  });

  // get specific shortfall applications
  app.get("/getSpecificShortfallApplication", async (req, res) => {
    const appNo = JSON.parse(req.query.appNo);
    const result = await shortfallCollection.findOne({ applicationNo: appNo });
    res.send(result);
  });

  // get verification status
  app.get("/getVerificationStatus", verifyToken, async (req, res) => {
    jwt.verify(req.token, process.env.PRIVATE_TOKEN, async function (err) {
      if (err) {
        console.log("object");
        res.status(400).send({ message: "Unauthorized access" });
      } else {
        const allPS = await userCollection.find({ role: "PS" }).toArray();

        const allPsInfo = allPS.map((item) => {
          return {
            id: item?._id,
            district: item?.district,
            mandal: item?.mandal,
            gramaPanchayat: item?.gramaPanchayat,
            name: item?.name,
            contact: item?.phone,
          };
        });

        const verificationStatus = allPsInfo.map(async (eachPs) => {
          const queryForAppCame = {
            "buildingInfo.generalInformation.district": eachPs?.district,
            "buildingInfo.generalInformation.mandal": eachPs?.mandal,
            "buildingInfo.generalInformation.gramaPanchayat":
              eachPs?.gramaPanchayat,
          };

          const applicationNotVerified = await submitApplicationCollection
            .find(queryForAppCame)
            .toArray()?.length;

          const approved = await approvedCollection
            .find({ psId: eachPs?.id })
            .toArray();
          const shortfall = await shortfallCollection
            .find({ psId: eachPs?.id })
            .toArray();
          const rejected = await rejectedCollection
            .find({ psId: eachPs?.id })
            .toArray();

          const applicationVerified =
            approved?.length + shortfall?.length + rejected?.length;

          return {
            psId: eachPs?.id,
            psName: eachPs?.name,
            psContact: eachPs?.contact,
            assigned: applicationNotVerified + applicationVerified,
            verified: applicationVerified,
            pending: applicationNotVerified,
          };
        });

        Promise.all(verificationStatus).then((result) => {
          console.log(result);
          res.send(result);
        });
      }
    });
  });

  // async function downloadFile(authClient, fileName, fileId) {
  //   const drive = google.drive({ version: "v3", auth: authClient });

  //   if (fileName && fileId) {
  //     let dest = fs.createWriteStream(fileName);
  //     drive.files.get(
  //       { fileId: fileId, alt: "media" },
  //       { responseType: "stream" },
  //       (err, { data }) => {
  //         if (err) {
  //           console.log(err);
  //           return;
  //         }
  //         data
  //           .on("end", () => console.log("Done."))
  //           .on("error", (err) => {
  //             console.log(err);
  //             return process.exit();
  //           })
  //           .pipe(dest);
  //       }
  //     );
  //   } else console.log("Please specify file name/file id");
  // }

  async function downloadFile(authClient, fileName, fileId, res) {
    const drive = google.drive({ version: "v3", auth: authClient });

    if (fileName && fileId) {
      const fileStream = await drive.files.get(
        { fileId: fileId, alt: "media" },
        { responseType: "stream" }
      );

      if (fileStream) {
        res.setHeader(
          "Content-disposition",
          `attachment; filename=${fileName}`
        );
        res.setHeader("Content-type", "application/octet-stream");
        fileStream.data
          .on("end", () => {
            console.log("Done.");
            // Send a success message to the client

            // res.status(200).json({ message: "File downloaded successfully" });
          })
          .on("error", (err) => {
            console.log(err);

            // res.status(500).json({ message: "Error downloading the file" });
          })
          .pipe(res);

        // Set the response headers for the file download
      } else {
        console.log("Failed to retrieve file stream.");
        // res.status(500).json({ message: "Failed to retrieve file stream" });
      }
    } else {
      console.log("Please specify file name/file id");
      // res.status(400).json({ message: "Please specify file name/file id" });
    }
  }

  app.get("/downloadFile", async (req, res) => {
    const { fileName, fileId } = JSON.parse(req.query.data);
    console.log(fileName, fileId);
    authorize().then((authClient) =>
      downloadFile(authClient, fileName, fileId, res)
    );
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
      siteInspection: "1uVuXJz9kfWXyAg5ENfEiWL2qfDtCMa_Z",
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
  app.patch("/updateDraftApplicationData", async (req, res) => {
    const { userId, oldApplicationNo } = JSON.parse(req.query.filterData);
    const newDraftData = req.body;

    // const applicationNo = newDraftData?.applicationNo;

    // console.log(userId, "USERID", "NEW DRAFT", newDraftData);

    const filter = { userId, applicationNo: oldApplicationNo };

    const OldApplicationData = await draftApplicationCollection.findOne(filter);

    // console.log(oldDraftData, "OLD DRAFT MAIN");

    console.log(OldApplicationData, "Old draft data");
    console.log(newDraftData, "New draft data");

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

    console.log(updatedData, "UPDATE DATA");
    console.log(filter, "FILTER");

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

    if (findApplication && newData?.siteInspection) {
      console.log("Aslam");
      const fileIdArr = [];
      const oldSiteBoundariesImageIds =
        findApplication?.siteInspection?.siteBoundaries
          ?.siteBoundariesImageFilesId;

      const newSiteBoundariesImageIds =
        newData?.siteInspection?.siteBoundaries?.siteBoundariesImageFilesId;

      console.log(oldSiteBoundariesImageIds, newSiteBoundariesImageIds);

      if (oldSiteBoundariesImageIds && newSiteBoundariesImageIds) {
        console.log("Aschi inside");
        for (const key in newSiteBoundariesImageIds) {
          if (
            oldSiteBoundariesImageIds[key] !== newSiteBoundariesImageIds[key]
          ) {
            fileIdArr.push(oldSiteBoundariesImageIds[key]);
          }
        }
      }

      console.log(fileIdArr, "SITE INSPECTION FILE ID");

      fileIdArr.length &&
        fileIdArr.forEach((fileId) => {
          if (fileId.length) {
            authorize().then((authClient) =>
              deleteGoggleDriveFile(authClient, fileId)
            );
          }
        });
    }

    // console.log(findApplication, "Find application");

    const updateData = { ...findApplication, ...newData };

    // console.log(findApplication, "findApplication");

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

    const data = req.body;

    console.log(id, data);

    // if (data?.role?.toLowerCase() === "ps") {
    //   data["handOver"] = data?.handOver === "true" ? true : false;
    // }

    const filter = { _id: new ObjectId(id) };

    const updateDoc = {
      $set: {
        ...data,
      },
    };

    console.log(updateDoc);

    const result = await userCollection.updateOne(filter, updateDoc);

    res.send(result);
  });

  const findIndexOfExistDistrict = (oldLocations, districtName) => {
    return oldLocations?.findIndex(
      (eachLocation) => eachLocation.name === districtName
    );
  };

  // add district, mandal and village
  app.patch("/addLocation", async (req, res) => {
    console.log(req.query.data, "add LOCATION");
    const data = JSON.parse(req.query.data);

    const resultOfOldValue = await districtCollection.find({}).toArray();

    const oldLocations = resultOfOldValue[0]?.district;
    console.log(oldLocations, "OLD");

    let newLocations;

    const districtName = data?.district;
    const findDistrictIndex = findIndexOfExistDistrict(
      oldLocations,
      districtName
    );

    if (data?.mandal?.length) {
      console.log(data?.mandal, "Mandal");

      const mandalName = data?.mandal;

      const mandalArr = oldLocations[findDistrictIndex]?.mandal;

      const findIndexOfExistMandal = mandalArr?.findIndex(
        (eachMandal) => eachMandal?.name === mandalName
      );

      if (data?.village?.length) {
        const villageName = data?.village;

        if (findIndexOfExistMandal === -1) {
          mandalArr.push({ name: mandalName, village: [villageName] });
        } else {
          const isVillageNameExist = mandalArr[findIndexOfExistMandal][
            "village"
          ].findIndex((eachVillageName) => eachVillageName === villageName);

          if (isVillageNameExist === -1) {
            mandalArr[findIndexOfExistMandal]["village"].push(villageName);
          }
        }

        oldLocations[findDistrictIndex]["mandal"] = mandalArr;
      } else {
        if (findDistrictIndex === -1) {
          oldLocations.push({
            name: districtName,
            mandal: [{ name: mandalName, village: [] }],
          });
        } else {
          console.log(findIndexOfExistMandal, "MANDAL INdex");

          if (findIndexOfExistMandal === -1) {
            mandalArr.push({ name: mandalName, village: [] });

            oldLocations[findDistrictIndex]["mandal"] = mandalArr;
          }
        }
      }
    } else {
      console.log(data?.district, "District");

      if (findDistrictIndex === -1) {
        oldLocations.push({ name: districtName, mandal: [] });
      }

      console.log(findDistrictIndex);
    }

    newLocations = [...oldLocations];
    const updateDoc = {
      $set: { district: newLocations },
    };

    const filter = { _id: new ObjectId(resultOfOldValue[0]?._id) };

    const result = await districtCollection.updateOne(filter, updateDoc);
    console.log(result, "RESULT LOC");

    if (result.acknowledged) {
      res.send({ msg: "Location added successfully", response: result });
    } else {
      res.send({ msg: "Failed to add location", response: result });
    }
  });

  // remove location
  app.patch("/removeLocation", async (req, res) => {
    console.log(req.query.data, "remove LOCATION");
    const data = JSON.parse(req.query.data);

    const resultOfOldValue = await districtCollection.find({}).toArray();

    const oldLocations = resultOfOldValue[0]?.district;
    console.log(oldLocations, "OLD");

    let newLocation;

    const districtName = data?.district;
    const findDistrictIndex = findIndexOfExistDistrict(
      oldLocations,
      districtName
    );

    const mandalName = data?.mandal;
    const mandalArr = oldLocations[findDistrictIndex]?.mandal;

    const findIndexOfExistMandal = mandalArr?.findIndex(
      (eachMandal) => eachMandal?.name === mandalName
    );

    if (data?.mandal?.length) {
      console.log(data?.mandal, "Mandal");
      if (data?.village?.length) {
        const villageName = data?.village;

        if (findIndexOfExistMandal === -1) {
          res.send({ msg: "Location not found" });
          return;
        } else {
          const isVillageExist = mandalArr[
            findIndexOfExistMandal
          ]?.village.findIndex((eachVillage) => eachVillage === villageName);

          console.log(isVillageExist, villageName, "VILLAGE EXIST");
          console.log(
            mandalArr[findIndexOfExistMandal]?.village[isVillageExist]
          );
          if (isVillageExist === -1) {
            res.send({ msg: "Location not found" });
            return;
          } else {
            mandalArr[findIndexOfExistMandal]?.village.splice(
              isVillageExist,
              1
            );

            console.log(mandalArr[findIndexOfExistMandal]?.village);
            oldLocations[findDistrictIndex]["mandal"] = [...mandalArr];
          }
        }
      } else {
        if (findDistrictIndex === -1) {
          res.send({ msg: "Location not found" });
          return;
        } else {
          console.log(findDistrictIndex, "district index");

          console.log(
            oldLocations[findDistrictIndex]?.mandal,
            "FIND VALUE OF INDEX"
          );

          console.log(findIndexOfExistMandal, "MANDAL INdex");

          if (findIndexOfExistMandal === -1) {
            res.send({ msg: "Location not found" });
            return;
          } else {
            mandalArr.splice(mandalArr[findIndexOfExistMandal], 1);
            oldLocations[findDistrictIndex]["mandal"] = [...mandalArr];
          }
        }
      }
    } else {
      console.log(data?.district, "District");

      if (findDistrictIndex === -1) {
        res.send({ msg: "Location not found" });
        return;
      } else {
        oldLocations.splice(findDistrictIndex, 1);
      }
    }

    newLocation = [...oldLocations];

    const updateDoc = {
      $set: { district: newLocation },
    };

    const filter = { _id: new ObjectId(resultOfOldValue[0]?._id) };

    const result = await districtCollection.updateOne(filter, updateDoc);
    console.log(result, "RESULT LOC");

    if (result.acknowledged) {
      res.send({ msg: "Location removed successfully", response: result });
    } else {
      res.send({ msg: "Failed to remove location", response: result });
    }
  });

  // store resubmit application
  app.patch("/storeResubmitApplication", async (req, res) => {
    const { oldImageFiles, appNo } = JSON.parse(req?.query?.data);

    // delete previous image files from the google drive
    oldImageFiles.length &&
      oldImageFiles.forEach((fileId) => {
        if (fileId.length) {
          authorize().then((authClient) =>
            deleteGoggleDriveFile(authClient, fileId)
          );
        }
      });

    const needToStoreData = req.body;

    const updateDoc = {
      $set: needToStoreData,
    };

    const result = await shortfallCollection.updateOne(
      { applicationNo: appNo },
      updateDoc
    );

    if (result?.acknowledged) {
      const findApplication = await shortfallCollection.findOne({
        applicationNo: appNo,
      });

      delete findApplication["_id"];
      delete findApplication["psDocumentPageObservation"];
      delete findApplication["psDrawingPageObservation"];
      delete findApplication["siteInspection"];
      delete findApplication["psId"];
      delete findApplication["psSubmitDate"];
      delete findApplication["shortfallSerialNo"];

      const submitApplication = await submitApplicationCollection.insertOne(
        findApplication
      );

      const deleteFromShortfall = await shortfallCollection.deleteOne({
        applicationNo: appNo,
      });

      res.send(result);
    }
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

  app.delete("/decisionOfPs", async (req, res) => {
    const { applicationNo, trackPSAction, psId } = JSON.parse(req.query.data);

    console.log(req.query.data, "DECIsion");

    const filter = {
      applicationNo: applicationNo,
    };

    const findApplication = await submitApplicationCollection.findOne(filter);

    const date = new Date();

    const day = date.getDate().toString().padStart(2, "0");

    const month = (date.getMonth() + 1).toString().padStart(2, "0");

    const year = date.getFullYear();

    const psSubmitDate = `${day}-${month}-${year}`;

    const status =
      (trackPSAction === "reject" && "Rejected") ||
      (trackPSAction === "approved" && "Approved") ||
      (trackPSAction === "shortfall" && "Shortfall");

    console.log(status, "Status");

    let needToAdd;

    if (trackPSAction === "shortfall") {
      const allShortfallApplications = await shortfallCollection
        .find({})
        .toArray();

      let maxShortfallNo = 0;

      if (allShortfallApplications?.length > 0) {
        const allShortfallSerialNo = allShortfallApplications?.map(
          (eachApp) => eachApp?.shortfallNo
        );
        maxShortfallNo = Math.max(...allShortfallSerialNo);
      }

      needToAdd = {
        psSubmitDate,
        status,
        shortfallSerialNo: maxShortfallNo + 1,
        psId,
      };
    } else {
      needToAdd = { psSubmitDate, status, psId };
    }

    const updateData = { ...findApplication, ...needToAdd };

    console.log(updateData, "updateDoc");
    const updateDoc = {
      $set: updateData,
    };

    const result = await submitApplicationCollection.updateOne(
      filter,
      updateDoc
    );

    if (result.acknowledged) {
      const findApplication = await submitApplicationCollection.findOne(filter);

      console.log(findApplication, "AFTER SUBMITTED DATA");

      let insertedData;

      if (trackPSAction === "reject") {
        insertedData = await rejectedCollection.insertOne(findApplication);
      } else if (trackPSAction === "approved") {
        insertedData = await approvedCollection.insertOne(findApplication);
      } else if (trackPSAction === "shortfall") {
        insertedData = await shortfallCollection.insertOne(findApplication);
      }

      const deleteData = await submitApplicationCollection.deleteOne(filter);

      res.send(insertedData);
    } else {
      res.send({ statusText: "Server Error" });
    }
  });
}

run().catch(console.dir);

const schedule = require("node-schedule");
async function performMongoDBAction() {
  const client = new MongoClient(uri);

  try {
    await client.connect();

    const db = client.db("Construction-Application");

    // Your MongoDB operations here
    const submitCollection = db.collection("submitApplication");
    const approvedCollection = db.collection("approvedApplication");

    const allSubmitApplications = await submitCollection.find({}).toArray();
    console.log(allSubmitApplications, "All");

    const checkDaysPassed = (dateFromDB) => {
      const dateAsFormat = dateFromDB.split("-").reverse().join("-");
      console.log(dateAsFormat, "FIRST GET DATE");

      const targetDate = new Date(dateAsFormat);

      const currentDate = new Date();

      const timeDifference = currentDate - targetDate;

      const daysDifference = timeDifference / (24 * 3600 * 1000);

      console.log(daysDifference, "days difference");

      if (daysDifference > 15) {
        console.log(targetDate, daysDifference);
        return 1;
      } else {
        return 0;
      }
    };

    allSubmitApplications.forEach(async (eachApplication) => {
      const isPassed = checkDaysPassed(eachApplication?.submitDate);
      console.log(isPassed, "IS PASSED");
      if (isPassed) {
        eachApplication["status"] = "approved";
        delete eachApplication["_id"];
        await approvedCollection.insertOne({ ...eachApplication });

        await submitCollection.deleteOne({
          applicationNo: eachApplication.applicationNo,
        });
      }
    });

    // const result = await collection.insertOne({ key: "value" });
    // console.log("Document inserted:", result.ops[0]);
  } catch (err) {
    console.error(
      "Error connecting to MongoDB or performing the operation:",
      err
    );
  }
}

// Schedule the task to run after a 30-second delay
const taskTime = "0 0 * * *"; // 30 seconds from now

// const taskTime = new Date(new Date().getTime() + 5 * 1000); // 30 seconds from now
const job = schedule.scheduleJob(taskTime, () => {
  performMongoDBAction();
});

// Export the Express API
module.exports = app;
