package pl.mebloprojekt.core

fun main() {
    val board = MaterialSpec("white-18", "Biała laminowana", 18)
    val spec = CabinetSpec(
        widthMm = 600,
        heightMm = 720,
        depthMm = 280,
        boardMaterial = board,
        frontMaterial = board,
        shelfCount = 3,
        doorCount = 2,
        horizontalAssembly = HorizontalAssembly.BETWEEN_SIDES,
        frontMount = FrontMount.OVERLAY,
        backType = BackType.HDF
    )

    val result = CabinetCalculator.calculate(spec)
    check(result.internalWidthMm == 564)
    check(result.totalDepthIncludingFrontMm == 298)
    check(result.parts.first { it.kind == PartKind.FRONT }.widthMm == 297)
    check(result.parts.first { it.kind == PartKind.BACK }.widthMm == 598)

    val inset = CabinetCalculator.calculate(
        spec.copy(frontMount = FrontMount.INSET)
    )
    check(inset.shelfDepthMm == 260)
    check(inset.totalDepthIncludingFrontMm == 280)

    println("OK: podstawowe reguły obliczeń działają")
    println("Formatki: ${result.parts.size}, komory: ${result.compartmentHeightsMm}")
}
