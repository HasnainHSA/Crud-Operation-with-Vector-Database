import express from "express";
import { customAlphabet } from 'nanoid'
const nanoid = customAlphabet('1234567890', 20)
import cors from 'cors'
import path from 'path';
const __dirname = path.resolve();
import { PineconeClient } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import "dotenv/config.js";


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

import './config/index.mjs'


const pinecone = new PineconeClient();
await pinecone.init({
  environment: process.env.PINECONE_ENVIRONMENT,
  apiKey: process.env.PINECONE_API_KEY,
});



const app = express();
app.use(express.json());
app.use(cors(["http://localhost:3000", "127.0.0.1", "https://ewrer234234.appspot.app.com"]));





app.get("/api/v1/stories", async (req, res) => {

  const queryText = ""

  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: queryText,
  });
  const vector = response?.data[0]?.embedding
  console.log("vector: ", vector);


  const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
  const queryResponse = await index.query({
    queryRequest: {
      vector: vector,
      // id: "vec1",
      topK: 100,
      includeValues: false,
      includeMetadata: true,
      // namespace: process.env.PINECONE_NAME_SPACE
    }
  });

  queryResponse.matches.map(eachMatch => {
    console.log(`score ${eachMatch.score.toFixed(1)} => ${JSON.stringify(eachMatch.metadata)}\n\n`);
  })
  console.log(`${queryResponse.matches.length} records found `);

  res.send(queryResponse.matches)
});


app.get("/api/v1/search", async (req, res) => {

  const queryText = req.query.q;

  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: queryText,
  });
  const vector = response?.data[0]?.embedding
  console.log("vector: ", vector);


  const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
  const queryResponse = await index.query({
    queryRequest: {
      vector: vector,
      topK: 20,
      includeValues: false,
      includeMetadata: true,
    }
  });

  queryResponse.matches.map(eachMatch => {
    console.log(`score ${eachMatch.score.toFixed(3)} => ${JSON.stringify(eachMatch.metadata)}\n\n`);
  })
  console.log(`${queryResponse.matches.length} records found `);

  res.send(queryResponse.matches)
});

app.post("/api/v1/story", async (req, res) => {

  const startTime = new Date();

  console.log("req.body: ", req.body);

  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: `${req.body?.title} ${req.body?.body}`,
  });
  const vector = response?.data[0]?.embedding

  // response time
  const responseTime = new Date() - startTime;
  console.log("responseTime: ", responseTime);



  const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
  const upsertRequest = {
    vectors: [
      {
        id: nanoid(), 
        values: vector,
        metadata: {
          title: req.body?.title,
          body: req.body?.body,
        }
      }
    ],
    // namespace: process.env.PINECONE_NAME_SPACE,
  };
  try {
    const upsertResponse = await index.upsert({ upsertRequest });
    console.log("upsertResponse: ", upsertResponse);
    // response time
    const responseTime = new Date() - startTime;
    console.log("pinecone responseTime: ", responseTime);

    res.send({
      message: "story created successfully"
    });
  } catch (e) {
    console.log("error: ", e)
    res.status(500).send({
      message: "failed to create story, please try later"
    });
  }
});

app.put("/api/v1/story/:id", async (req, res) => {


  console.log("req.params.id: ", req.params.id);
  console.log("req.body: ", req.body);
  
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: `${req.body?.title} ${req.body?.body}`,
  });
  console.log("response?.data: ", response?.data);
  const vector = response?.data[0]?.embedding
  console.log("vector: ", vector);
 


  const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
  const upsertRequest = {
    vectors: [
      {
        id: req.params.id, 
        values: vector,
        metadata: {
          title: req.body?.title,
          body: req.body?.body,
        }
      }
    ],
    // namespace: process.env.PINECONE_NAME_SPACE,
  };
  try {
    const upsertResponse = await index.upsert({ upsertRequest });
    console.log("upsertResponse: ", upsertResponse);

    res.send({
      message: "story updated successfully"
    });
  } catch (e) {
    console.log("error: ", e)
    res.status(500).send({
      message: "failed to create story, please try later"
    });
  }
});


app.delete("/api/v1/story/:id", async (req, res) => {

  try {
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
    const deleteResponse = await index.delete1({
      ids: [req.params.id],
      // namespace: process.env.PINECONE_NAME_SPACE
    })
    // const ns = index.namespace(process.env.PINECONE_NAME_SPACE);
        console.log("deleteResponse: ", deleteResponse);

    res.send({
      message: "story deleted successfully"
    });

  } catch (e) {
    console.log("error: ", e)
    res.status(500).send({
      message: "failed to create story, please try later"
    });
  }

});

//  baseurl/filename.txt
app.get(express.static(path.join(__dirname, "./web/build")));
app.use("/", express.static(path.join(__dirname, "./web/build")));




app.use((req, res) => {
  res.status(404).send("not found");
})


const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
