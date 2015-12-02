/**
 * Attach event when document is ready!
 */
(function($) {
    $(function() {

        /**
         * Used to test if we scroll direction
         * Avoid to load more images when scrolling up in the detection zone
         * @type {number}
         */
        var old_scroll_top = 0;

        /**
         * Photoswipe global template element (dom element)
         */
        var $pswp = $('.pswp')[0];

        /**
         * Photoswipe javascript object
         * Contains api to interact with library
         * @type PhotoSwipe
         */
        var pswp = null;

        /**
         * Default rows by step
         * @type {number}
         */
        var minNumberOfRowsAtStart = 2;

        /**
         * Computing tools to organize images
         */
        var organizer = tx_infiniteScrollGallery_organizer;

        /**
         * Everything starts here. Called in the end of this file.
         * For each gallery in the page, set a body container (dom element) and compute images sizes, then add elements to dom container
         */
        function initGallery() {

            for (var i = 0; i < infinitesScrollGallery.length; i++) {
                var gallery = infinitesScrollGallery[i];
                gallery.pswpContainer = [];
                gallery.rootElement = $('#tx-infinitescrollgallery-' + gallery.id);
                gallery.bodyElement = gallery.rootElement.find('.tx-infinitescrollgallery-body');
                organizer.organize(gallery);
                addElements(gallery);
            }
        }

        /**
         * Add a number of rows to DOM container, and to Photoswipe gallery.
         * If rows are not given, is uses backoffice data or compute according to browser size
         * @param gallery target
         * @param rows
         */
        function addElements(gallery, rows) {

            if (!gallery) {
                gallery = getGallery();
            }

            if (!rows) {
                rows = getDefaultPageSize(gallery);
            }

            var nextImage = gallery.pswpContainer.length;
            var lastRow = gallery.pswpContainer.length ? gallery.images[nextImage].row + rows : rows;

            // Select next elements, comparing their rows
            for (var i = nextImage; i < gallery.images.length; i++) {
                var element = gallery.images[i];
                if (element.row < lastRow) {

                    // Add enlarged to Photoswipe gallery
                    gallery.pswpContainer.push({
                        src: element.enlarged,
                        w: element.eWidth,
                        h: element.eHeight,
                        title: element.title
                    });

                    // Transform in DOM elements and store it
                    var figure = getFigure(element, gallery);
                    element.figure = figure;

                    gallery.bodyElement.append(figure.figure);

                    bindClick(figure.image, gallery);
                    styleFigure(element, gallery);
                }
            }

            gallery.rootElement.find('.tx-infinitescrollgallery-numberOfVisibleImages').text(gallery.pswpContainer.length);
            gallery.rootElement.find('.tx-infinitescrollgallery-totalImages').text(gallery.images.length);

        }

        /**
         * Return number of rows to show per page,
         * If a number of rows are specified in the backoffice, this data is used.
         * If not specified, uses the vertical available space to compute the number of rows to display.
         * There is a variable in the header of this file to specify the  minimum number of rows for the computation (minNumberOfRowsAtStart)
         * @param gallery
         * @returns {*}
         */
        function getDefaultPageSize(gallery) {

            if (gallery.limit) {
                return gallery.limit;
            }

            var winHeight = $(window).height();
            var top = gallery.bodyElement.offset().top;
            var galleryVisibleHeight = winHeight - top;
            var maxRowHeight = gallery.thumbnailMaximumHeight;
            var nbRows = Math.ceil(galleryVisibleHeight / maxRowHeight);

            return nbRows < minNumberOfRowsAtStart ? minNumberOfRowsAtStart : nbRows;
        }

        /**
         * Create DOM elements according to element raw data (thumbnail and enlarged urls)
         * Also apply border-radius at this level because it never changed threw time
         * @param element
         * @param gallery
         * @returns {{figure: (*|HTMLElement), image: *}}
         */
        function getFigure(element, gallery) {

            var $figure = $('<figure></figure>');
            var $image = $('<a></a>')
                .css('background-image', 'url(' + element.thumbnail + ')')
                .attr('href', element.enlarged);

            if (gallery.round) {
                $image.css('border-radius', gallery.round)
            }

            $figure.append($image);

            return {
                figure: $figure,
                image: $image
            };
        }

        /**
         * Use computed (organized) data to apply style (size and margin) to elements on DOM
         * Does not apply border-radius because is used to restyle data on browser resize, and border-radius don't change.
         * @param element
         * @param gallery
         */
        function styleFigure(element, gallery) {

            element.figure.figure
                   .css('width', element.width)
                   .css('height', element.height)
                   .css('margin-right', gallery.margin)
                   .css('margin-bottom', gallery.margin);

            if (element.last) {
                element.figure.figure.css('margin-right', 0);
            }

            element.figure.image
                   .css('display', 'none')
                   .css('width', element.width)
                   .css('height', element.height);

            element.figure.image.fadeIn({duration: 1000});
        }

        /**
         * Open photoswipe gallery on click
         * Add elements to gallery when navigating until last element
         * @param image
         * @param gallery
         */
        function bindClick(image, gallery) {

            image.on('click', function(e) {
                e.preventDefault();

                var self = this;
                var options = {
                    index: $(this).parent('figure').index(),
                    bgOpacity: 0.85,
                    showHideOpacity: true,
                    loop: false
                };

                pswp = new PhotoSwipe($pswp, PhotoSwipeUI_Default, gallery.pswpContainer, options);
                pswp.init();

                var overrideLoop = null;

                // Loading one more page when going to next image
                pswp.listen('beforeChange', function(delta) {
                    // Positive delta indicates "go to next" action, we don't load more objects on looping back the gallery (same logic when scrolling)
                    if (delta > 0 && pswp.getCurrentIndex() == pswp.items.length - 1) {
                        addElements(getGallery(self));
                    } else if (delta === -1 * (pswp.items.length - 1)) {
                        overrideLoop = pswp.items.length;
                        addElements(getGallery(self));
                    }
                });

                // After change cannot detect if we are returning back from last to first
                pswp.listen('afterChange', function() {
                    if (overrideLoop) {
                        pswp.goTo(overrideLoop);
                        overrideLoop = null;
                    }
                });
            });
        }

        /**
         * Empty DOM container and Photoswipe container
         * @param gallery
         */
        function resetElements(gallery) {
            gallery.pswpContainer = [];
            gallery.bodyElement.html('');
        }

        /**
         * Get gallery according to the given element
         * Search parenting to find the gallery id.
         * If no element is passed, it take the first gallery in the list (should be the single one anyway)
         * @param element a DOM element
         * @returns {*}
         */
        function getGallery(element) {

            var gallery = infinitesScrollGallery[0];
            if (element) {
                var galleryId = $(element).parents('.tx-infinitescrollgallery').data('galleryid');

                var gallery = null;
                for (var i = 0; i < infinitesScrollGallery.length; i++) {
                    if (infinitesScrollGallery[i].id === Number(galleryId)) {
                        gallery = infinitesScrollGallery[i];
                        break;
                    }
                }
            }
            return gallery;
        }

        /**
         * Attach event to the drop down menu
         */
        $('#tx-infinitescrollgallery-category').change(function(event) {

            // Reset variable
            //infinitesScrollGallery.numberOfScroll = 0;
            //$('#tx-infinitescrollgallery-offset').val(0);
            //$('#tx-infinitescrollgallery-form').submit();

            // Empty image stack before loading
            //$('#tx-infinitescrollgallery-recordnumber').hide();
        });

        /**
         * Attach event to next button
         */
        $('.tx-infinitescrollgallery-next a').on('click', function(e) {
            e.preventDefault();
            addElements(getGallery(this)); // don't specify number of rows, addElements is smart enough to guess it
        });

        /**
         * Attach event to the search field
         */
        $('.tx-infinitescrollgallery-searchTerm').keydown(function(event) {
            // True when key 'enter' hit
            if (event.keyCode == 13) {
                event.preventDefault();
                resetElements(getGallery(this));
            }
        });

        /**
         * Scroll
         * Load new images when scrolling down
         * Allow scroll if there is only a single gallery on page and no limit specified
         * If the limit is specified, the gallery switch to manual mode.
         */
        if (infinitesScrollGallery.length == 1 && getGallery().limit === 0) {

            $('.tx-infinitescrollgallery-next').hide();

            $(document).scroll(function() {

                var gallery = getGallery().bodyElement;
                var endOfGalleryAt = gallery.offset().top + gallery.height() - $(window).height() + 150;

                // Avoid to expand gallery if we are scrolling up
                var current_scroll_top = $(document).scrollTop();
                var scroll_delta = current_scroll_top - old_scroll_top;
                old_scroll_top = current_scroll_top;

                // "enableMoreLoading" is a setting coming from the BE bloking / enabling dynamic loading of thumbnail
                if (scroll_delta > 0 && $(window).scrollTop() > endOfGalleryAt) {

                    // When scrolling only add a row at once
                    addElements(getGallery(), 1);

                    // Computes if there are more images to display and an ajax request can be sent against the server
                    //var numberOfVisibleImages = parseInt($("#tx-infinitescrollgallery-numberOfVisibleImages").html());
                    //var totalImages = parseInt($("#tx-infinitescrollgallery-totalImages").html());

                }
            });
        }

        /**
         * Use the underscore library debounce function (copied further in the file)
         */
        $(window).on('resize', debounce(function() {
            organizer.organize(null, resize);
        }, 200));

        /**
         * Empty a gallery and add the same elements with new size
         */
        function resize() {
            for (var i = 0; i < infinitesScrollGallery.length; i++) {
                var gallery = infinitesScrollGallery[i];
                var nbRows = gallery.images[gallery.pswpContainer.length - 1].row + 1;
                resetElements(gallery);
                addElements(gallery, nbRows);
            }
        }

        /**
         * Debounce function from *Underscore.js*
         * @param func
         * @param wait
         * @param immediate
         * @returns {Function}
         */
        function debounce(func, wait, immediate) {
            var timeout;
            return function() {
                var context = this, args = arguments;
                var later = function() {
                    timeout = null;
                    if (!immediate) func.apply(context, args);
                };
                var callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func.apply(context, args);
            };
        }

        initGallery();

    });
})(jQuery);
