import Cocoa
import Vision

let args = CommandLine.arguments
if args.count < 2 {
    print("Usage: swift ocr.swift <image_path>")
    exit(1)
}

let imagePath = args[1]
guard let image = NSImage(contentsOfFile: imagePath),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("Failed to load image")
    exit(1)
}

let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])
let request = VNRecognizeTextRequest { request, error in
    guard let observations = request.results as? [VNRecognizedTextObservation] else {
        return
    }
    for observation in observations {
        if let topCandidate = observation.topCandidates(1).first {
            print(topCandidate.string)
        }
    }
}
request.recognitionLanguages = ["vi-VN"]
request.usesLanguageCorrection = true

do {
    try requestHandler.perform([request])
} catch {
    print("Error: \(error)")
}
