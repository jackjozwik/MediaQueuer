<!-- src/components/Footer.svelte -->
<script>
  // Import any necessary components or stores
  const currentYear = new Date().getFullYear();
</script>

<footer class="footer">
  <div class="container">
    <div class="footer-content">
      <div class="footer-copyright">
        <span>© {currentYear} TV Media Queuer</span>
      </div>
      
      <div class="footer-links">
        <a href="/about" class="footer-link">About</a>
        <a href="/privacy" class="footer-link">Privacy</a>
        <a href="/terms" class="footer-link">Terms</a>
      </div>
    </div>
  </div>
</footer>

<style>
  .footer {
    padding: var(--space-4) 0;
    border-top: 1px solid var(--color-border);
    background-color: var(--color-surface);
    transition: var(--transition-colors);
  }

  .footer-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .footer-links {
    display: flex;
    gap: var(--space-4);
  }

  .footer-link {
    color: var(--color-text-secondary);
    text-decoration: none;
    transition: var(--transition-colors);
  }

  .footer-link:hover {
    color: var(--color-primary);
  }

  /* Responsive design */
  @media (max-width: 640px) {
    .footer-content {
      flex-direction: column;
      gap: var(--space-3);
      text-align: center;
    }
  }
</style> 