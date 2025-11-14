export function getEditorConfig(currentLang: 'ar' | 'en') {
  return {
    toolbar: {
      items: [
        'heading',
        '|',
        'bold',
        'italic',
        'underline',
        'strikethrough',
        '|',
        'fontSize',
        'fontFamily',
        'fontColor',
        'fontBackgroundColor',
        '|',
        'bulletedList',
        'numberedList',
        'outdent',
        'indent',
        '|',
        'blockQuote',
        'codeBlock',
        '|',
        'insertImage',
        '|',
        'undo',
        'redo'
      ]
    },
    alignment: {
      options: ['left', 'center', 'right', 'justify']
    },
    language: currentLang === 'ar' ? 'ar' : 'en',
    image: {
      toolbar: [
        'imageTextAlternative',
        '|',
        'imageStyle:inline',
        'imageStyle:block',
        'imageStyle:side',
        '|',
        'resizeImage:25',
        'resizeImage:50',
        'resizeImage:75',
        'resizeImage:original'
      ],
      resizeOptions: [
        { name: 'resizeImage:25', value: '25', label: '25%', icon: 'small' },
        { name: 'resizeImage:50', value: '50', label: '50%', icon: 'medium' },
        { name: 'resizeImage:75', value: '75', label: '75%', icon: 'large' },
        { 
          name: 'resizeImage:original', 
          value: null, 
          label: currentLang === 'ar' ? 'الحجم الأصلي' : 'Original', 
          icon: 'original' 
        }
      ],
      styles: ['inline', 'block', 'side']
    },
    heading: {
      options: [
        { 
          model: 'paragraph', 
          title: currentLang === 'ar' ? 'فقرة' : 'Paragraph', 
          class: 'ck-heading_paragraph' 
        },
        { 
          model: 'heading1', 
          view: 'h1', 
          title: currentLang === 'ar' ? 'عنوان رئيسي' : 'Heading 1', 
          class: 'ck-heading_heading1' 
        },
        { 
          model: 'heading2', 
          view: 'h2', 
          title: currentLang === 'ar' ? 'عنوان فرعي' : 'Heading 2', 
          class: 'ck-heading_heading2' 
        },
        { 
          model: 'heading3', 
          view: 'h3', 
          title: currentLang === 'ar' ? 'عنوان ثالث' : 'Heading 3', 
          class: 'ck-heading_heading3' 
        }
      ]
    }
  };
}
