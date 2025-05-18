function trackCoordinates() {
    const $canvas = $('#canvas');
    let startX, startY;
    let isSelecting = false;

    $canvas.on('mousedown', function(e) {
        const rect = this.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        isSelecting = true;
    });

    $canvas.on('mouseup', function(e) {
        if (!isSelecting) return;
        
        const rect = this.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;

        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);

        console.log('Выделенная зона:', {
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height)
        });

        $('<div>')
            .addClass('selection-box')
            .css({
                position: 'absolute',
                left: x + 'px',
                top: y + 'px',
                width: width + 'px',
                height: height + 'px',
                border: '2px solid red',
                pointerEvents: 'none'
            })
            .appendTo($canvas.parent())
            .fadeOut(1000, function() {
                $(this).remove();
            });

        isSelecting = false;
    });

    $canvas.on('mouseout', function() {
        isSelecting = false;
    });
}

$(document).ready(function() {
    trackCoordinates();
}); 