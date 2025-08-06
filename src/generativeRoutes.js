const express = require('express');
const router = express.Router();
const db = require('./db');
const fs = require('fs');
const open_ai = require('openai');
const openai = new open_ai.OpenAI({apiKey: process.env.OPENAI_API_KEY,});

async function createFile(filePath) {
  let result;
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    // Download the file content from the URL
    const res = await fetch(filePath);
    const buffer = await res.arrayBuffer();
    const urlParts = filePath.split("/");
    const fileName = urlParts[urlParts.length - 1];
    const file = new File([buffer], fileName);
    result = await openai.files.create({
      file: file,
      purpose: "assistants",
    });
  } else {
    // Handle local file path
    const fileContent = fs.createReadStream(filePath);
    result = await openai.files.create({
      file: fileContent,
      purpose: "assistants",
    });
  }
  console.log(result)
  return result.id;
}


// TODO move
router.post('/new', async (req, res) => {
  const { filePath, project_name } = req.body;
  if (!filePath) {
    return res.status(400).json({ error: 'File path is required' });
  }
  const fileId = await createFile(filePath);

  const vectorStore = await openai.vectorStores.create({
      name: "knowledge_base",
  });

  await openai.vectorStores.files.create(
    vectorStore.id,
    {
        file_id: fileId,
    }
  );
  // console.log(fileId)

  // const result = await openai.vectorStores.files.list(vectorStore.id);
  // console.log(result);

  db.run('INSERT INTO projects (name, user_id, vector_store_id) VALUES (?, ?, ?)', [project_name || "New Project", 1, vectorStore.id], async function (err) {
    if (err) return res.status(400).json({ error: err.message });
    const project = await db.get('SELECT * FROM projects WHERE id = ?', [this.lastID]);
    res.json({ project: project, status: "success" });
  })
});

router.post('/upload', async (req, res) => {
  const { filePath, project_id } = req.body;
  if (!filePath) {
    return res.status(400).json({ error: 'File path is required' });
  }
  const fileId = await createFile(filePath);
  const vector_store_id = await db.get(`SELECT vector_store_id FROM projects WHERE id = ?`, [project_id]);

  await openai.vectorStores.files.create(
    vector_store_id,
    {
        file_id: fileId,
    }
  );
  // console.log(fileId)

  // const result = await openai.vectorStores.files.list(vector_store_id.id);
  // console.log(result);
  res.json({ vector_store_id: vector_store_id, project_id: project_id, status: "success" });
});

// POST generate summary
router.post('/generateSummary', async (req, res) => {
  const { project_id, vector_store_id } = req.body;
  if (!project_id) {
    return res.status(400).json({ error: 'Project id is required' });
  }
  
  db.all('SELECT vector_store_id FROM projects WHERE id = ?', [project_id], function (err, rows) {
    if (err) return res.status(400).json({ error: err.message });

    // Update old entries to obsolete them
    db.run('UPDATE summaries SET obsolete = 1 WHERE project_id = ?', [project_id], async function (err) {
      if (err) return res.status(400).json({ error: err.message });
      
      // Generate new entries
      const response = await openai.responses.create({
        model: "gpt-4.1-mini-2025-04-14",
        prompt: {
      "id": "pmpt_6890d15a96ac81959f54473946c1bab50fd91f879e70eead",
      "version": "2"
    },
      input: "Create a summary of the documents in the vector store.",
      tools: [
          {
              type: "file_search",
              vector_store_ids: [vector_store_id || rows[0].vector_store_id],
            },
          ],
    });
    // console.log(response);
    const response_output = JSON.parse(response.output_text)
    const response_content = response_output.content
    
    // Store them into db
    response_content.forEach(content => {
      const chapter = content.chapter;
      const summary = content.summary;
      
      db.run('INSERT INTO summaries (chapter, summary, obsolete, project_id) VALUES (?, ?, ?, ?)',
          [chapter, summary, 0, project_id],
          function (err) {
            if (err) return res.status(400).json({ error: err.message });
          });
        });
        res.json(response_output);
    });
  });
});

// POST generate quizzes
router.post('/generateQuizzes', async (req, res) => {
  const { quizset_name, project_id, vector_store_id, emphasis } = req.body;
  if (!project_id) {
    return res.status(400).json({ error: 'Project id is required' });
  }

  db.all('SELECT vector_store_id FROM projects WHERE id = ?', [project_id], function (err, rows) {
    if (err) return res.status(400).json({ error: err.message });
    // console.log(rows[0].vector_store_id)
    
    // Create a new quizset
    db.run('INSERT INTO quizsets (name, project_id) VALUES (?, ?)', [quizset_name || "New Quizset", project_id], async function (err) {
      if (err) return res.status(400).json({ error: err.message });
      const quizset_id = this.lastID;
      
      const input_prompt = emphasis ? "Create quiz questions based on documents in the vector store with an emphasis on " + emphasis + "." : "Create quiz questions based on documents in the vector store."
      // console.log(input_prompt);
      
      // Generate new quizzes
      const response = await openai.responses.create({
        model: "gpt-4.1-mini-2025-04-14",
        prompt: {
          "id": "pmpt_6890db2b6f3c8194888c38dd2fecb1dd034d52569d0c8ef7",
          "version": "2"
        },
        input: input_prompt,
        tools: [
          {
            type: "file_search",
            vector_store_ids: [vector_store_id || rows[0].vector_store_id],
          },
        ],
      });
      // console.log(response);
      const response_output = JSON.parse(response.output_text)
      const response_content = response_output.questions
      
      // Store them into db
      response_content.forEach(content => {
        const question = content.question;
        const options = content.options;
        const answer = content.answer;
        const explanation = content.explanation;
        
        db.run('INSERT INTO quizzes (project_id, quizset, question, options, answer, explanation) VALUES (?, ?, ?, ?, ?, ?)',
          [project_id, quizset_id, question, JSON.stringify(options), answer, explanation],
          function (err) {
            if (err) return res.status(400).json({ error: err.message });
          });
        });
        
        res.json(response_output);
      });
    });
});

// POST generate flashcards
router.post('/generateFlashcards', async (req, res) => {
  const { project_id, vector_store_id } = req.body;
  if (!project_id) {
    return res.status(400).json({ error: 'Project id is required' });
  }
  db.all('SELECT vector_store_id FROM projects WHERE id = ?', [project_id], async function (err, rows) {
    if (err) return res.status(400).json({ error: err.message });
    // console.log(rows[0].vector_store_id)
      
      // Generate new flashcards
      const response = await openai.responses.create({
        model: "gpt-4.1-mini-2025-04-14",
        prompt: {
          "id": "pmpt_6890dc3a8f18819495b0f1607dd63e7d0467ec484d5547c5",
          "version": "1"
        },
        input: "Create a set of flashcards based on documents in the vector store.",
        tools: [
          {
            type: "file_search",
            vector_store_ids: [vector_store_id || rows[0].vector_store_id],
          },
        ],
      });
      // console.log(response);
      const response_output = JSON.parse(response.output_text)
      const response_content = response_output.items
      
      // Store them into db
      response_content.forEach(content => {
        const question = content.question;
        const answer = content.answer;
        
        db.run('INSERT INTO flashcards (project_id, question, answer) VALUES (?, ?, ?)',
          [project_id, question, answer],
          function (err) {
            if (err) return res.status(400).json({ error: err.message });
          });
        });
        
        res.json(response_output);
      });
    });
    
module.exports = router;