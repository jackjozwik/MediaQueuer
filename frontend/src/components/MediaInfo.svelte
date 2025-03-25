<script>
  import { toTitleCase, capitalizeSentences, capitalizeNames } from '$lib/textFormat';

  // Props to receive
  export let currentItem;
  export let hasQRCode = false;
</script>

<div class="media-info" class:hidden={currentItem.metadata?.hide_info}>
  <div class="info-content">
    <!-- Profile image section - only shown if profile image exists -->
    {#if currentItem.profile_image}
      <div class="profile-section">
        <div class="profile-image">
          <img src={currentItem.profile_image} alt="Profile" />
        </div>
      </div>
    {/if}
    
    <!-- Text content section -->
    <div class="text-section">
      {#if !currentItem.metadata?.hide_title}
        <h2 class="title">{toTitleCase(currentItem.title || 'Untitled')}</h2>
      {/if}
      
      {#if currentItem.description && !currentItem.metadata?.hide_description}
        <p class="description">{capitalizeSentences(currentItem.description)}</p>
      {/if}
      
      {#if !currentItem.metadata?.hide_creator}
        <p class="creator">
          Created by: {capitalizeNames(currentItem.full_name || currentItem.uploaded_by || 'Unknown')}
        </p>
      {/if}
    </div>

    <!-- QR code section - only shown if one exists -->
    {#if hasQRCode}
      <div class="qr-code-section">
        <img src={currentItem.qr_code} alt="QR Code" class="qr-code" />
      </div>
    {/if}
  </div>
</div>

<style>
  .media-info {
    position: absolute;
    bottom: 20px;
    left: 0;
    background-color: rgba(0, 0, 0, 0.7);
    box-sizing: border-box;
    width: 650px;
    max-width: 65%;
    min-height: 130px;
    height: auto;
    border-top-right-radius: 8px;
  }

  .info-content {
    display: flex;
    align-items: center;
    padding: 16px;
    min-height: 100%;
    overflow: visible;
  }

  /* Profile image section */
  .profile-section {
    margin-right: 20px;
    flex-shrink: 0;
  }

  .profile-image,
  .profile-placeholder {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid rgba(255, 255, 255, 0.5);
    background-color: #333;
  }

  .profile-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Text content section */
  .text-section {
    flex: 1;
    margin-right: 20px;
    min-width: 0;
    max-width: 100%;
  }

  .title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 6px 0;
    overflow: visible;
    white-space: normal;
    text-overflow: ellipsis;
  }

  .description {
    font-size: 1rem;
    margin: 0 0 6px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    opacity: 0.9;
  }

  .creator {
    font-size: 0.9rem;
    margin: 0;
    opacity: 0.7;
  }

  /* QR code section */
  .qr-code-section {
    border-left: 1px solid rgba(255, 255, 255, 0.3);
    padding-left: 20px;
    flex-shrink: 0;
  }

  .qr-code {
    width: 120px;
    height: auto;
    max-height: 120px;
    background-color: #fff;
    padding: 4px;
    border-radius: 4px;
    object-fit: contain; /* Maintain aspect ratio */
    margin: auto;
  }

  .media-info.hidden {
    display: none;
  }

  /* Media queries for responsive design */
  @media (max-width: 768px) {
    .title {
      font-size: 1.2rem;
    }
    
    .description {
      font-size: 0.9rem;
    }
    
    .creator {
      font-size: 0.8rem;
    }
    
    .profile-image, .profile-placeholder {
      width: 45px;
      height: 45px;
    }
    
    .qr-code {
      width: 65px;
      height: 65px;
    }
    
    .media-info {
      max-width: 90%;
    }
  }
  
  /* For wider screens, ensure the info box doesn't stretch too much */
  @media (min-width: 1600px) {
    .media-info {
      max-width: 550px; /* Absolute max width for very large displays */
    }
  }
</style> 