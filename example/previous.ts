// import { Hono } from 'hono';
// import {z} from 'zod'
// import { zValidator } from '@hono/zod-validator'
// import { apiKeyAuth } from '../../middlewares/api-key';
// import { logScraperRequest } from '../../services/transactionLogger';

// type Variables ={
//   apiKeyName:string;
// }

// const scraper = new Hono<{ Bindings: CloudflareBindings,Variables:Variables }>();

// const itemSchema =z.object({
//     data_size:z.number().min(1),
//     identifier:z.string(),
//     date_start:z.string().optional(),
//     date_end:z.string().optional(),
//   });

// const inputSchema = z.object({
//   webhook_url:z.url().optional(),
//   extras:z.record(z.string(), z.any()).optional(),
//   data:z.array(itemSchema).min(1).max(50),
// })

// scraper.use('/*',apiKeyAuth);

// scraper.get('/test', (c) => {
//   console.log(c.get('apiKeyName'),"====> api key is here");

//     return c.json({ 
//         status: 'ok', 
//         message: 'Scraper Endpoint',
//         version: '1.0.0',
//     });
// })

// scraper.post('/instagram/tagged',
//   zValidator('json', inputSchema),
//   async (c) => {
//   try {
//     const messages = c.req.valid('json');

//     // send via http 
//     const httpUrl = c.env.CLOUDAMQP_HTTP_URL;
//     const amqpUser = c.env.CLOUDAMQP_USERNAME;
//     const amqpPass = c.env.CLOUDAMQP_PASSWORD;

//     if (!httpUrl) {
//       return c.json({ error: 'CloudAMQP HTTP URL not configured' }, 500);
//     }

//     // parallel for each message
    

//     const webhook_input = messages.webhook_url;

//     const extras_input = messages.extras || {};
//     const messages_input = messages.data;
//     const msgSends = messages_input.map(msg => {
//       const tagged_url = `https://www.instagram.com/${msg.identifier}/tagged`;
//       const scraper_webhook = `${c.env.APP_PUBLIC_URL}/webhooks/instagram/tagged?account_name=${msg.identifier}&client_webhook=${webhook_input}&extras=${encodeURIComponent(JSON.stringify(extras_input))}`;
      
//       const payload_args = {
//         url: tagged_url,
//         max_item: msg.data_size,
//         webhook_endpoint: scraper_webhook,
//       };

//       const payloadMsg = JSON.stringify({
//         "task":"run_instagram_listing_scraper",
//         "args": [payload_args]
//       })


//       return fetch(httpUrl, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Basic ${btoa(`${amqpUser}:${amqpPass}`)}` 
//         },
//         body: JSON.stringify({
//           properties: {
//             delivery_mode: 2, // persistent
//             content_type: 'application/json', 
//           },
//           routing_key: 'scrape_request_listing',
//           payload: payloadMsg,
//           payload_encoding: 'string'
//         })
//       });
//     });

//     await Promise.all(msgSends);
//     // write trx data

//     const dataRequest={
//       keyName:c.get('apiKeyName') || 'unknown',
//       scraper:'instagram_tagged',
//       webhook_url:webhook_input || '',
//       requestDataMsg:JSON.stringify(messages_input),
//       extras:JSON.stringify(extras_input)
//     }

//     await logScraperRequest(dataRequest);
    
//     return c.json({ 
//       success: true, 
//       message: 'Message sent to CloudAMQP',
//       data: { sent_messages: messages_input.length } 
//     });
    
//   } catch (error) {
//     console.error('Error sending message:', error);
//     return c.json({ 
//       error: 'Failed to send message',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     }, 500);
//   }
// });



// export default scraper;