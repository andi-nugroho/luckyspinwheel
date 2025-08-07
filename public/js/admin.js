const swalConfig = {
    background: '#1f2937',
    backdrop: `
        rgba(0,0,0,0.7)
        linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)
    `,
    customClass: {
        popup: 'bg-gradient-custom',
        title: 'text-purple-300',
        htmlContainer: 'text-gray-300',
        confirmButton: 'bg-purple-600 hover:bg-purple-700',
        cancelButton: 'bg-red-600 hover:bg-red-700'
    }
};

document.getElementById('prizeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const prizeData = {
        name: formData.get('name'),
        probability: formData.get('probability'),
        description: formData.get('description'),
        imageUrl: formData.get('imageUrl'),
        color: formData.get('color')
    };

    try {
        const response = await fetch('/admin/prize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prizeData)
        });

        if (response.ok) {
            Swal.fire({
                ...swalConfig,
                icon: 'success',
                title: 'Success',
                text: 'Prize added successfully'
            }).then(() => {
                location.reload();
            });
        } else {
            throw new Error('Failed to add prize');
        }
    } catch (error) {
        Swal.fire({
            ...swalConfig,
            icon: 'error',
            title: 'Error',
            text: 'Failed to add prize. Please try again.'
        });
    }
});

async function deletePrize(id) {
    const result = await Swal.fire({
        ...swalConfig,
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/admin/prize/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                Swal.fire({
                    ...swalConfig,
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Prize has been deleted.',
                    timer: 1500
                }).then(() => location.reload());
            } else {
                throw new Error('Failed to delete prize');
            }
        } catch (error) {
            Swal.fire({
                ...swalConfig,
                icon: 'error',
                title: 'Error',
                text: 'Failed to delete prize. Please try again.'
            });
        }
    }
}

document.getElementById('tokenForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const tokenData = {
        prize: formData.get('prize'),
        tokenCount: parseInt(formData.get('tokenCount')) || 1
    };

    try {
        const response = await fetch('/generate-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tokenData)
        });

        const data = await response.json();
        const resultDiv = document.getElementById('result');
        const tokenList = document.getElementById('tokenList');
        
        tokenList.innerHTML = data.tokens.map(token => 
            `<div class="p-2 bg-gray-600 rounded flex justify-between items-center">
                <span class="font-mono">${token}</span>
                <button onclick="copyToClipboard('${token}')" class="text-xs bg-gray-500 px-2 py-1 rounded hover:bg-gray-400">
                    Copy
                </button>
            </div>`
        ).join('');
        
        resultDiv.classList.remove('hidden');
    } catch (error) {
        Swal.fire({
            ...swalConfig,
            icon: 'error',
            title: 'Error',
            text: 'Failed to generate tokens. Please try again.'
        });
    }
});

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        Swal.fire({
            ...swalConfig,
            icon: 'success',
            title: 'Copied!',
            text: 'Token copied to clipboard',
            timer: 1500,
            showConfirmButton: false
        });
    } catch (err) {
        Swal.fire({
            ...swalConfig,
            icon: 'error',
            title: 'Error',
            text: 'Failed to copy token'
        });
    }
}

function refreshPrizes() {
    location.reload();
}

async function editPrize(prize) {
    const { value: formValues } = await Swal.fire({
        ...swalConfig,
        title: 'Edit Prize',
        html: `
            <div class="space-y-4">
                <div class="text-left">
                    <label class="block text-sm font-medium mb-2">Prize Name</label>
                    <input id="swal-name" class="w-full p-2 rounded bg-gray-700 border border-gray-600" 
                           value="${prize.name}" required>
                </div>
                <div class="text-left">
                    <label class="block text-sm font-medium mb-2">Probability (%)</label>
                    <input id="swal-probability" type="number" min="0" max="100" 
                           class="w-full p-2 rounded bg-gray-700 border border-gray-600" 
                           value="${prize.probability}" required>
                </div>
                <div class="text-left">
                    <label class="block text-sm font-medium mb-2">Description</label>
                    <textarea id="swal-description" class="w-full p-2 rounded bg-gray-700 border border-gray-600" 
                              rows="2">${prize.description || ''}</textarea>
                </div>
                <div class="text-left">
                    <label class="block text-sm font-medium mb-2">Image URL</label>
                    <input id="swal-image" type="url" class="w-full p-2 rounded bg-gray-700 border border-gray-600" 
                           value="${prize.image_url || ''}">
                </div>
                <div class="text-left">
                    <label class="block text-sm font-medium mb-2">Color</label>
                    <input id="swal-color" type="color" class="w-full p-1 rounded bg-gray-700 border border-gray-600" 
                           value="${prize.color || '#808080'}">
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Save Changes',
        preConfirm: () => ({
            name: document.getElementById('swal-name').value,
            probability: document.getElementById('swal-probability').value,
            description: document.getElementById('swal-description').value,
            imageUrl: document.getElementById('swal-image').value,
            color: document.getElementById('swal-color').value
        })
    });

    if (formValues) {
        try {
            const response = await fetch(`/admin/prize/${prize.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formValues)
            });

            if (response.ok) {
                Swal.fire({
                    ...swalConfig,
                    icon: 'success',
                    title: 'Updated!',
                    text: 'Prize has been updated.',
                    timer: 1500
                }).then(() => location.reload());
            } else {
                throw new Error('Failed to update prize');
            }
        } catch (error) {
            Swal.fire({
                ...swalConfig,
                icon: 'error',
                title: 'Error',
                text: 'Failed to update prize. Please try again.'
            });
        }
    }
}
