# 1688 Auto Scraping (Still work in progress)

This project automates the process of scraping product information from 1688.com using Puppeteer. It searches for specified keywords, collects product URLs, and scrapes details like price, reviews, and ratings.

## Features

- Navigate to 1688.com and search for products based on keywords
- Scrape product details such as title, price, stars, number of reviews, and URL
- Handle multiple pages of search results (Will implement later)

## Requirements

- Node.js
- Puppeteer
- Puppeteer-extra
- Puppeteer-extra-plugin-stealth

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/YipKean/1688webScrap
    cd 1688-auto-scraping
    ```

2. Install the dependencies:
    ```bash
    npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
    ```

## Configuration

will update later

## Usage

1. Run the script:
    ```bash
    node main.js
    ```

2. The script will launch a Chrome browser, navigate to 1688.com, search for the specified keywords, and scrape product details.



