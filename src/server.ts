import express from "express";
import { askQuestion } from "./travelAssistant.js";
import path, {dirname} from 'path'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.listen(3001, () => {
  console.log("Server running on port 3001");
});

app.use(express.json()); // for parsing application/json

app.use("/", express.static(path.join(__dirname, '../public')));

app.post("/getReccomendation", async (req: any, res: any, next: any) => {
  const question: string = req.body.question;

  try {
    const response = await askQuestion(question);

    res.json(response);
  } catch (error) {
    res.status(500).send("No response");
  }
});
