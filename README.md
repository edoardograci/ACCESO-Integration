# ACCESO - Map & Moodboard

A web application that integrates with Notion databases and Supabase to display location data on a map and create visual moodboards from Notion content.

## Features

- **Interactive Map**: Display location data from Notion databases using Leaflet.js
- **Moodboard**: Visual inspiration board that automatically fetches images from Notion and uploads them to Supabase
- **Image Processing**: Automatic conversion of images to WebP format for optimal storage
- **Supabase Integration**: Secure image storage and retrieval using Supabase Storage
- **Responsive Design**: Modern, mobile-friendly interface

## Prerequisites

- Node.js (v14 or higher)
- Notion API access token
- Supabase project with Storage enabled
- Notion database with moodboard content

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Notion Configuration
NOTION_TOKEN=your_notion_integration_token
NOTION_DATABASE_ID=your_notion_database_id
NOTION_MOODBOARD_ID=your_notion_moodboard_id

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=3000
```

### Getting Notion Credentials

1. Go to [Notion Developers](https://developers.notion.com/)
2. Create a new integration
3. Copy the integration token
4. Share your database/moodboard with the integration
5. Copy the database/moodboard IDs from the URL

### Getting Supabase Credentials

1. Go to [Supabase](https://supabase.com/)
2. Create a new project
3. Go to Settings > API
4. Copy the project URL and anon key
5. Copy the service role key (for server-side operations)
6. Create a storage bucket named "Moodboard"

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd "ACCESO - Map & Moodboard"
```

2. Install dependencies:
```bash
npm install
```

3. Set up your environment variables in the `.env` file

4. Start the server:
```bash
npm start
```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

### Home Page (`/`)
- Displays an interactive map with location data from your Notion database
- Use the sidebar to search and filter locations
- Toggle between grid and list views

### Moodboard Page (`/moodboard`)
- Automatically fetches images from your Notion moodboard database
- Converts images to WebP format and uploads them to Supabase
- Displays images in a responsive grid layout
- Upload new images directly to the moodboard

## API Endpoints

- `GET /data` - Fetch data from the main Notion database
- `GET /moodboard` - Serve the moodboard HTML page
- `GET /api/moodboard` - Fetch moodboard data from Notion
- `POST /api/upload-image` - Upload and process images to Supabase

## Image Processing

The application automatically:
1. Detects images in your Notion database
2. Downloads them from Notion
3. Converts them to WebP format using Sharp
4. Uploads them to your Supabase "Moodboard" storage bucket
5. Displays them using the Supabase public URLs

## File Structure

```
├── public/
│   ├── index.html          # Main page with map
│   ├── moodboard.html      # Moodboard page
│   ├── moodboard.css       # Moodboard styles
│   ├── moodboard.js        # Moodboard functionality
│   ├── style.css           # Main page styles
│   └── script.js           # Main page functionality
├── server.js               # Express server with API endpoints
├── package.json            # Dependencies and scripts
└── .env                    # Environment variables (create this)
```

## Customization

### Adding New Image Sources
The moodboard automatically detects images from various Notion property types:
- Files (external and file types)
- URL properties containing image links
- Rich text with image URLs

### Styling
- Modify `public/moodboard.css` to customize the moodboard appearance
- Update `public/style.css` for main page styling
- The design is fully responsive and uses modern CSS features

### Database Schema
The application is flexible and works with various Notion database structures. It automatically extracts:
- Image URLs from file properties
- Titles from title or rich text properties
- Descriptions from rich text or multi-select properties
- Creation and modification dates

## Troubleshooting

### Common Issues

1. **Images not loading**: Check that your Supabase storage bucket is public and named "Moodboard"
2. **Notion API errors**: Verify your integration token and database permissions
3. **Upload failures**: Ensure your Supabase service role key has storage write permissions

### Debug Mode
Check the browser console and server logs for detailed error information.

## Security Notes

- Keep your `.env` file secure and never commit it to version control
- The service role key has elevated permissions - use it only on the server side
- Consider implementing rate limiting for production use

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For issues and questions, please check the troubleshooting section or create an issue in the repository.
