// import { Hono } from 'hono';
// import { InstagramPost_gd_lk5ns7kz21pck8jpis } from '../../../types/intagram_posts_gd_lk5ns7kz21pck8jpis';
// import { getErrorMessage, logError, mapTikTokToConvertedPost, typeConverterV2 } from '../../tools/helper';
// import { logWebhookClientRequest, logWebhookTiktokClientRequest } from '../../services/transactionLogger';
// import { tiktok_posts_gd_lu702nij2f790tmv9h } from '../../../types/tiktok_posts_gd_lu702nij2f790tmv9h';
// import { getTiktokScrapingRequestByID } from '../../services/tiktokScraperDBHelper';

// interface CloudflareBindings {
//   WEBHOOK_URL_FAIR: string;
// }

// const webhooks = new Hono<{ Bindings: CloudflareBindings }>();

// webhooks.post('/instagram/tagged', async (c) => {
//     try {
//       const client_webhook = c.req.query('client_webhook');
//       const account_name = c.req.query('account_name');
//       const extras_param = c.req.query('extras');
  
//       // Parse request body
//       const payload_resp: InstagramPost_gd_lk5ns7kz21pck8jpis[] = await c.req.json();
  
//       // Process data
//       const validPayload = payload_resp.filter(item => item?.url);
//       const validCount = validPayload.length;
//       const totalCount = payload_resp.length;
//       const convertedData = validPayload.map(typeConverterV2);
      
//       // Parse extras safely
//       let extras = {};
//       if (extras_param) {
//         try {
//           extras = JSON.parse(extras_param);
//         } catch (extrasError) {
//           logError('Extras parse error:', extrasError);
//         }
//       }
  
//       // Build final payload
//       const payload = {
//         account_name: account_name ?? null,
//         date_scraped: new Date().toISOString(),
//         posts: convertedData,
//         extras,
//       };

//       if (client_webhook) {
//         try {
//           const cl_resp = await fetch(client_webhook, {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(payload)
//           });

//           const resp_status = cl_resp.status;
//           const resp_body = await cl_resp.text();
//           const error_message = cl_resp.ok ? '' : `Webhook responded with status ${resp_status}`;

//           const webhookLogData = {
//             webhook_url: client_webhook,
//             account_name: account_name,
//             extras,
//             total_scrape_response_count: totalCount,
//             valid_scrape_count: validCount,
//             raw_payload: payload,
//             response_status: resp_status,
//             response_body: resp_body,
//             error_message
//           }

//           await logWebhookClientRequest(webhookLogData);
          
//         } catch (err) {
//           logError('Webhook delivery failed:', err);
//         }
//       }
  
//       return c.json({ 
//         success: true, 
//         message: 'Data received',
//         processed: convertedData.length 
//       });
      
//     } catch (error) {
//       logError('Unexpected error:', error);
      
//       return c.json({ 
//         success: false, 
//         error: getErrorMessage(error)
//       }, 500);
//     }
// });

// webhooks.post('/tiktok/videos', async (c) => {
//   const request_id = c.req.query('request_id');

//   // get request info
//   const requestScrapingInfo = await getTiktokScrapingRequestByID(request_id||'');

//   const hashTagRequested = requestScrapingInfo?.identifier || '';
//   let extras: Record<string, unknown> = {};
//   const rawExtras = requestScrapingInfo?.extras;
//   if (rawExtras) {
//     try {
//       extras = typeof rawExtras === 'string' ? JSON.parse(rawExtras) : rawExtras;
//     } catch (extrasError) {
//       logError('Extras parse error:', extrasError);
//     }
//   }

//   const payload_resp:tiktok_posts_gd_lu702nij2f790tmv9h[] = await c.req.json();
  
//   const validPayload = payload_resp.filter(item => item?.url);
//   const convertedData = validPayload.map(mapTikTokToConvertedPost);
//   const client_webhook = requestScrapingInfo?.webhook_url || c.env.WEBHOOK_URL_FAIR;

//   const validCount = validPayload.length;
//   const totalCount = payload_resp.length;

//   const payload = {
//     account_name: hashTagRequested,
//     date_scraped: new Date().toISOString(),
//     extras,
//     posts: convertedData
//   }

//   if (client_webhook) {
//         try {
//           const cl_resp = await fetch(client_webhook, {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(payload)
//           });

//           const resp_status = cl_resp.status;
//           const resp_body = await cl_resp.text();
//           const error_message = cl_resp.ok ? '' : `Webhook responded with status ${resp_status}`;

//           const webhookLogData = {
//             webhook_url: client_webhook,
//             tiktok_hashtag: hashTagRequested,
//             extras,
//             total_scrape_response_count: totalCount,
//             valid_scrape_count: validCount,
//             response_status: resp_status,
//             response_body: resp_body,
//             error_message
//           }

//           await logWebhookTiktokClientRequest(webhookLogData);
          
//         } catch (err) {
//           logError('Webhook delivery failed:', err);
//         }
//   }
// })

// export default webhooks;