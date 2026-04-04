declare module "snowball-stemmers" {
  interface Stemmer {
    stem(word: string): string;
  }
  const snowballFactory: {
    newStemmer(language: string): Stemmer;
  };
  export default snowballFactory;
}
