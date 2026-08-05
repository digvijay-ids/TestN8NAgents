import '@testing-library/jest-dom';

// Polyfill File.text() for jsdom
if (typeof File !== 'undefined' && !File.prototype.text) {
  File.prototype.text = async function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}
