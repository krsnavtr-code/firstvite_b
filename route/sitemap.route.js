import express from 'express';
import generateSitemap from '../utils/sitemapGenerator.js';

const router = express.Router();

router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const sitemap = await generateSitemap(baseUrl);
    
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error serving sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

export default router;
