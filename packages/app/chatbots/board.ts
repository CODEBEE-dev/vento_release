import { getAuth } from 'protonode'
import APIContext from "app/bundles/context";
import { Protofy, getLogger, getServiceToken, generateEvent } from "protobase";
import { Application } from 'express';
import path from "path";
import { createChatbot } from "@extensions/chatbots/createChatbot";

const root = path.join(process.cwd(), '..', '..')
const logger = getLogger()

Protofy("type", "chatGPT")

function transformChats(prevChats, prompt: string) {
    const additionalSystemMessage = {
      role: "system",
      content: prompt
    };
    return [additionalSystemMessage, ...prevChats];
  }

export default Protofy("code", async (app:Application, context: typeof APIContext) => {
    createChatbot(app, 'board', async (req, res, chatbot) => {
        const {metadata, ...body} = req.body

        const {session, token} = getAuth(req)
        let agentName = req.query.agent as string

        if(!agentName) {
          chatbot.send("Agent parameter is required")
          chatbot.end()
          return
        }

        const agentUrl = `/api/agents/v1/${agentName}/agent_input`

        const userMessage = body.messages[body.messages.length - 1].content
        const prevMessages = body.messages.slice(0, body.messages.length - 1) //exclude the last message


        let response = await context.apis.fetch(
          'get',
          agentUrl
            + '?token=' + encodeURIComponent(token)
            + '&message=' + encodeURIComponent(userMessage)
            + '&history=' + encodeURIComponent(JSON.stringify(prevMessages))
            + '&board=' + encodeURIComponent(String(req.query.board))
        );

        if(typeof response !== 'string') {
          response = JSON.stringify(response)
        }

        // const message = "Message received"
        chatbot.send(response)
        chatbot.end()
        // chatbot.end()
    })


})