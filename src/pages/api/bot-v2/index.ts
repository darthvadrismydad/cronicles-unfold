import { CreateStoryFragmentMutation } from '@/api/graphql';
import { createStoryFragment } from '@/graphql/mutations';
import { NextApiRequest, NextApiResponse } from 'next';
import { GraphQLQuery } from '@aws-amplify/api';
import { API } from 'aws-amplify';

const url = "https://api.openai.com/v1/chat/completions"

const metaPrompt =
    `You are a narrator, telling an ever evolving, never ending story using the prompts given to you by various participants as inspiration.
     incorporate them into whatever story you are current telling, and ensure they meet up with 
     at least one other character if there is anyone else currently participating.
     always refer to the characters in the third person, never use first person to tell the story. 
     always use the name of the person who gave you the prompt.
     Convert any prompt from first person to third person.`.replace(/[\n\s]+/g, " ");

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { nextPrompt, origin, story } = req.body;

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    };

    const options = {
        "model": "gpt-3.5-turbo",
        "messages": [
            { "role": "system", "content": metaPrompt },
            { "role": "assistant", "content": `add ${origin.name} to the following tale: ${nextPrompt}` }
        ],
        "temperature": 0.7
    }

    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(options)
    });

    const result = await response.json();

    const text = result.choices[0].message.content;

    await API.graphql<GraphQLQuery<CreateStoryFragmentMutation>>({
        query: createStoryFragment,
        variables: {
            input: {
                originId: origin.id,
                originType: origin.type,
                storyStoryFragmentsId: story.id,
                fragment: nextPrompt,
            }
        }
    });

    await API.graphql<GraphQLQuery<CreateStoryFragmentMutation>>({
        query: createStoryFragment,
        variables: {
            input: {
                originId: result.id,
                originType: "Narrator",
                storyStoryFragmentsId: story.id,
                fragment: text,
            }
        }
    });

    res
        .status(201).end();
}