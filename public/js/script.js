const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const upload = document.getElementById('upload');
    const clearBtn = document.getElementById('clear');

    let image = null;
    let isDrawing = false;

    // Рисование
    canvas.addEventListener('mousedown', () => isDrawing = true);
    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseout', () => isDrawing = false);

    canvas.addEventListener('mousemove', draw);

    function draw(e) {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Загрузка изображения
    upload.addEventListener('change', function () {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (event) {
        image = new Image();
        image.onload = function () {
          canvas.width = image.width;
          canvas.height = image.height;
          ctx.drawImage(image, 0, 0);
        };
        image.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    // Очистка
    clearBtn.addEventListener('click', () => {
      if (image) {
        ctx.drawImage(image, 0, 0);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });