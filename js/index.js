// index.js

// on load...
window.addEventListener('load', function() {
    // Get the model card container
    let model_card_container = document.getElementById('model-card-container');

    // Create cards for all models listed in "models/models.json"
    fetch('models/models.json')
        .then(response => response.json())
        .then(models => {
            // Loop through each model and create a card
            for (const [key, model] of Object.entries(models)) {

                let card = document.createElement('div');
                card.style.backgroundColor = '#ffffff';
                card.style.border = '1px solid #ddd';
                card.style.borderRadius = '8px';
                card.style.padding = '15px';
                card.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                card.style.marginBottom = '10px';
                card.style.cursor = 'pointer'; // Make the entire card clickable

                card.style.textOverflow = 'ellipsis';
                card.style.overflow = 'hidden';
                card.style.whiteSpace = 'nowrap';

                // Model Name
                let model_name = model.nickname ? model.nickname : model.name;

                // Create a header for the card
                let card_header = document.createElement('div');
                card_header.innerHTML = `<strong>${model_name}</strong>`;
                card_header.style.display = 'flex';
                card_header.style.justifyContent = 'space-between';
                card_header.style.alignItems = 'center';

                // Add an indicator for collapsibility
                let toggle_indicator = document.createElement('span');
                toggle_indicator.innerHTML = '&#9654;'; // Right arrow
                toggle_indicator.style.transition = 'transform 0.3s ease';
                toggle_indicator.style.marginLeft = '10px'; // Add spacing for visibility
                toggle_indicator.style.fontSize = '1.2em'; // Make it more visible
                card_header.appendChild(toggle_indicator);

                // Create a content container for the details
                let card_content = document.createElement('div');
                card_content.style.maxHeight = '0';
                card_content.style.textOverflow = 'ellipsis';
                card_content.style.overflow = 'hidden';
                card_content.style.transition = 'max-height 0.3s ease';

                // Populate the content container with model details
                let details = '';


                if (model.nickname) {
                    // Add the base directory
                    details += `<strong>Base Directory</strong>: ${model.name}`;
                }

                let alpha = model.parameters.alpha;
                if (alpha == "1.0") {
                    details += `<br><strong>Training</strong>: Cross Entropy`;
                } else {
                    details += `<br><strong>Training</strong>: CYBORG, &alpha;=${alpha}`;
                    details += `<br><strong>Saliency Type</strong>: ${model.parameters.saliency || 'N/A'}`;
                    details += `<br><strong>Inverted</strong>: ${model.parameters.invert ? 'True' : 'False'}`;
                    details += `<br><strong>Mask Type</strong>: ${model.parameters.mask || 'N/A'}`;
                }
                details += `<br><strong>Architecture</strong>: ${model.parameters.architecture || 'N/A'}`;
                details += `<br><strong>Batch Size</strong>: ${model.parameters.batch_size || 'N/A'}`;
                details += `<br><strong>Epochs</strong>: ${model.parameters.num_epochs || 'N/A'}`;
                card_content.innerHTML = details;

                // Toggle functionality
                card.addEventListener('click', () => {
                    if (card_content.style.maxHeight === '0px' || card_content.style.maxHeight === '') {
                        card_content.style.maxHeight = card_content.scrollHeight + 'px';
                        toggle_indicator.style.transform = 'rotate(90deg)'; // Rotate arrow
                    } else {
                        card_content.style.maxHeight = '0';
                        toggle_indicator.style.transform = 'rotate(0deg)'; // Reset arrow
                    }
                });

                // Append header and content to the card
                card.appendChild(card_header);
                card.appendChild(card_content);

                // Append the card to the model card container
                model_card_container.appendChild(card);
            }
        })
        .catch(error => {
            console.error('Error loading models:', error);
            model_card_container.innerHTML = '<p>Error loading models.</p>';
        });
});