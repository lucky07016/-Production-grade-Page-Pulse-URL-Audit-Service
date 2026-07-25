import React from 'react';

export default function Footer() {
  return (
    <footer>
      <p>
        &copy; {new Date().getFullYear()} Page Pulse. All rights reserved. |{' '}
        <a 
          href="https://digitalheroesco.com" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          Built for Digital Heroes Training Task
        </a>
      </p>
    </footer>
  );
}
