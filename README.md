# chia-forks-dashboard

<div id="top"></div>
<!--
*** Thanks for checking out the Best-README-Template. If you have a suggestion
*** that would make this better, please fork the repo and create a pull request
*** or simply open an issue with the tag "enhancement".
*** Don't forget to give the project a star!
*** Thanks again! Now go create something AMAZING! :D
-->



<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]



<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/aaroncarpenter/chia-forks-dashboard">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Chia Forks Dashboard</h3>

  <p align="center">
    A small dashboard application to show balances of wallets from Chia and Forks.
    <br />
    <a href="https://github.com/aaroncarpenter/chia-forks-dashboard"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/aaroncarpenter/chia-forks-dashboard">View Demo</a>
    ·
    <a href="https://github.com/aaroncarpenter/chia-forks-dashboard/issues">Report Bug</a>
    ·
    <a href="https://github.com/aaroncarpenter/chia-forks-dashboard/issues">Request Feature</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

Chia Forks Dashboard

<!--
[![Product Name Screen Shot][product-screenshot]](https://example.com)

Here's a blank template to get started: To avoid retyping too much info. Do a search and replace with your text editor for the following: `github_username`, `repo_name`, `twitter_handle`, `linkedin_username`, `email`, `email_client`, `project_title`, `project_description`

-->
<p align="right">(<a href="#top">back to top</a>)</p>



### Built With

* [ElectronJS](https://electronjs.org/)
* [Bootstrap](https://getbootstrap.com)
* [JQuery](https://jquery.com)

<p align="right">(<a href="#top">back to top</a>)</p>


<!-- GETTING STARTED -->
## Getting Started

This is an example of how you may give instructions on setting up your project locally.
To get a local copy up and running follow these simple example steps.

### Prerequisites

<!--
This is an example of how to list things you need to use the software and how to install them.
* npm
  ```sh
  npm install npm@latest -g
  ```
-->

### Windows Installation

1. Download the EXE from the Releases.
2. Enter your Chia LauncherId in `C:\Users\[username]\AppData\Local\chia_forks_dashboard\app-[version]\resources\app\resources\config\clientConfig.json`
   ```json
   {
    "launcherid": ""
    }
     ```
3. Click File -> Add Wallet to enter your wallets from Chia and any Forks.  Most users will have multiple wallets per coin.

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- USAGE EXAMPLES -->
## Usage

<!--
Use this space to show useful examples of how a project can be used. Additional screenshots, code examples and demos work well in this space. You may also link to more resources.

_For more examples, please refer to the [Documentation](https://example.com)_

-->
<p align="right">(<a href="#top">back to top</a>)</p>



<!-- ROADMAP -->
## Roadmap

- [] Auto-Refresh dashboard based on timer

See the [open issues](https://github.com/aaroncarpenter/chia-forks-dashboard/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- CONTRIBUTING -->
## Contributing
<!--
Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#top">back to top</a>)</p>
-->

<!-- CONTACT -->
## Contact

Aaron Carpenter - [@discord](https://discordapp.com/users/872708817899646978) - aaron@redwolftek.com

Project Link: [https://github.com/aaroncarpenter/chia-forks-dashboard](https://github.com/aaroncarpenter/chia-forks-dashboard)

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [](@SirCotare at AllTheBlocks.NET for the API to retrieve all the balance data.)

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/aaroncarpenter/chia-forks-dashboard.svg?style=for-the-badge
[contributors-url]: https://github.com/aaroncarpenter/chia-forks-dashboard/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/aaroncarpenter/chia-forks-dashboard.svg?style=for-the-badge
[forks-url]: https://github.com/aaroncarpenter/chia-forks-dashboard/network/members
[stars-shield]: https://img.shields.io/github/stars/aaroncarpenter/chia-forks-dashboard.svg?style=for-the-badge
[stars-url]: https://github.com/aaroncarpenter/chia-forks-dashboard/stargazers
[issues-shield]: https://img.shields.io/github/issues/aaroncarpenter/chia-forks-dashboard.svg?style=for-the-badge
[issues-url]: https://github.com/aaroncarpenter/chia-forks-dashboard/issues
[license-shield]: https://img.shields.io/github/license/aaroncarpenter/chia-forks-dashboard.svg?style=for-the-badge
[license-url]: https://github.com/aaroncarpenter/chia-forks-dashboard/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/aaronmcarpenter
[product-screenshot]: images/screenshot.png