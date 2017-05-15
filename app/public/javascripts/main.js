document.addEventListener("DOMContentLoaded", function (event) {
    const dropZone = document.getElementById('drop-zone');
    const fileUploadInput = document.getElementById('file_upload_input');
    const finishContainer = document.getElementsByClassName('list-group')[0];

    let startUpload = function (files) {
        let file = files[0];
        let formData = new FormData();
        let xhr = new XMLHttpRequest();

        formData.append('file', file);
        xhr.open('post', '/file', true);

        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                let percentage = (e.loaded / e.total) * 100;
                updateProgress(percentage + "%")
            }
        };

        xhr.onerror = function (e) {
            console.log('Error');
            console.log(e);
        };

        xhr.onload = function () {
            console.log(this.statusText);
            setTimeout(function () {
                document.getElementsByClassName("progress-bar")[0].style.width = "0%";
            }, 2300)
        };
        xhr.send(formData);
    }

    fileUploadInput.addEventListener('change', function (e) {
        let files = this.files;
        e.preventDefault();
        startUpload(files);
    })


    dropZone.ondrop = function (e) {
        e.preventDefault();
        this.className = 'upload-drop-zone';

        startUpload(e.dataTransfer.files)
    }

    dropZone.ondragover = function () {
        this.className = 'upload-drop-zone drop';
        return false;
    }

    dropZone.ondragleave = function () {
        this.className = 'upload-drop-zone';
        return false;
    }

    function updateProgress(value) {
        const bar = document.getElementsByClassName("progress-bar")[0];
        bar.style.width = value;
    }

});

$(function () {
    $('#shareModal').on('show.bs.modal', function (event) {
        const button = $(event.relatedTarget);
        const fileId = button.data('file');
        const modal = $(this);

        $.get('/file/access/' + fileId, function (data) {
            console.log(data);
        });

        // modal.find('.modal-title').text('New message to ' + fileId)
        // modal.find('.modal-body input').val(fileId)
    })

    $("#accessSelect").select2({
        minimumInputLength: 2,
        multiple:true,
        width: '100%',
        dropdownAutoWidth : true,
        placeholder: 'Start typing',
        ajax: {
            url: '/user/search'
        }
    })
});