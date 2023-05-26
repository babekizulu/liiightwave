//libs
import React from 'react';
//components
import Article from '../Article';

const Research = () => {
  return (
    <div className='research-page'>
      <div className='page-header-container'>
        <header className='page-header'>
          <h1>research_</h1>
        </header>
      </div>
      <Article
        contentHeader={'formuliii'}
        contentHref={'https://formuliii.com'}
        content={
          'FORMULiii is a multidisciplinary formula tool, which provides a calculator interface for a variety of formulae from the fields of Economics, Accounting and Physics. Our current research focuses are on finding ways to implement graphing and spreadsheet functionality, as well as tools which give the user additional educational information about each calculator. This tool is made for thinkers, innovators, creators, and engineers and is designed to provide an intuitive and fast workflow for problem solving.'
        }
      />
      {/* <br />
      <Article
        contentHeader={'visualiiize'}
        contentHref={'https://visualiiize.com'}
        content={`VISUALiiiZE is an immersive data analytics technology that embeds metadata into the real world using XR as well as through interactive 3D map systems. The aim of our implementation of these technologies would be to make trends and patterns within regions visually accessible. The aim is to make this technology open source, and to provide visual insight metadata and tools which can be accessed and viewed by anyone, from an entrepreneur running a small business in their local community, to a scientific researcher wanting to record data and visually associate their data with specific areas so that others can view it using XR the next time they visit the area. They could also tag the area on our open source 3D eagles eye-view map called Atlas. This technology can also help collaborators in creative fields find each other more easily, share their art in more interesting and immersive ways by associating their art with specific areas as XR metadata, and identify areas which people are most likely to go to view or listen to their type of creative content, whether it’s visual art, music, or theatre. Ultimately, this research initiative has the potential to open people's eyes to opportunities, and to help people connect the dots and solve problems by showing them data in a way that is intuitive, interesting and encourages people to go out into the world and explore.`}
      />
      <br />
      <Article
        contentHeader={'curiculiii'}
        contentHref={'https://curiculiii.com'}
        content={`CURiCULiii is a peer-to-peer academic publishing and reviewing platform. This platform is intended to pave a pathway for a peer review system for independent learners and researchers. Learners and researchers can submit and publish papers to their peer review network, and ML models can be implemented to tutor learners, guide them in their research process and assess their papers and give it a rating. By making partnerships with formal tertiary institutions and their researchers, this technology has the potential to increase access to education and to inspire lifelong learning, by making tools and knowledge more readily available.`}
      /> */}
    </div>
  );
};

export default Research;
