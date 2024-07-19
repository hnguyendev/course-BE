# Project Name
course-BE

## Overview
Provide a brief description of your project, its purpose, and any key features.

## Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/en/download/)
- [npm](https://www.npmjs.com/get-npm)
- [MongoDB](https://www.mongodb.com/)
- [Redis](https://upstash.com/) (if using Redis)
- [Cloudinary](https://cloudinary.com/)

## Setup

1. **Clone the repository**

    ```bash
    git clone https://github.com/your-username/your-repository.git
    cd your-repository
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Create a `.env` file**

    In the root directory of the project, create a `.env` file and add the following environment variables:

    ```env
    PORT=8000
    ORIGIN=["http://localhost:8000/"]

    NODE_ENV=development

    DB_URL=your_database_url

    CLOUD_NAME=your_cloud_name
    CLOUD_API_KEY=your_cloud_api_key
    CLOUD_SECRET_KEY=your_cloud_secret_key

    REDIS_URL=your_redis_url

    ACCESS_TOKEN=your_access_token
    ACCESS_TOKEN_EXPIRE=your_access_token_expiration_time
    REFRESH_TOKEN=your_refresh_token
    REFRESH_TOKEN_EXPIRE=your_refresh_token_expiration_time

    ACTIVATION_SECRET=your_activation_secret

    SMTP_HOST=your_smtp_host
    SMTP_PORT=your_smtp_port
    SMTP_SERVICE=your_smtp_service
    SMTP_MAIL=your_smtp_mail
    SMTP_PASSWORD=your_smtp_password
    ```

    Replace `your_database_url`, `your_cloud_name`, `your_cloud_api_key`, `your_cloud_secret_key`, `your_redis_url`, `your_access_token`, `your_access_token_expiration_time`, `your_refresh_token`, `your_refresh_token_expiration_time`, `your_activation_secret`, `your_smtp_host`, `your_smtp_port`, `your_smtp_service`, `your_smtp_mail`, and `your_smtp_password` with the actual values.

4. **Run the development server**

    ```bash
    npm run dev
    ```

    Your application should now be running on [http://localhost:8000](http://localhost:8000).

## Usage

## Contributing

## License
